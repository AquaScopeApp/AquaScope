"""
Tank Report Card — automated health assessment.

Computes an overall grade (A+ to F) from:
  - Parameter Stability (20%)
  - Maintenance Compliance (20%)
  - Livestock Health (20%)
  - Equipment Status (15%)
  - Tank Maturity (15%)
  - Water Chemistry (ICP) (10%)
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.models.tank import Tank, TankEvent
from app.models.livestock import Livestock
from app.models.maintenance import MaintenanceReminder
from app.models.disease import DiseaseRecord
from app.models.equipment import Equipment
from app.models.consumable import Consumable
from app.models.score_history import ScoreHistory


def _score_to_grade(score: int) -> str:
    """Map 0-100 score to letter grade."""
    if score >= 97: return "A+"
    if score >= 93: return "A"
    if score >= 90: return "A-"
    if score >= 87: return "B+"
    if score >= 83: return "B"
    if score >= 80: return "B-"
    if score >= 77: return "C+"
    if score >= 73: return "C"
    if score >= 70: return "C-"
    if score >= 67: return "D+"
    if score >= 63: return "D"
    if score >= 60: return "D-"
    return "F"


def _score_to_status(score: int) -> str:
    if score >= 90: return "excellent"
    if score >= 75: return "good"
    if score >= 60: return "fair"
    if score >= 40: return "poor"
    return "critical"


def _compute_scores_at_date(
    db: Session, tank_id: str, user_id: str, target_date: date,
) -> dict:
    """Compute sub-scores for a tank as if 'today' were *target_date*.

    Used both by the live report card and by the backfill routine.
    Returns a flat dict of the six category scores.
    """
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == user_id).first()
    if not tank:
        return None

    # --- Livestock at target_date ---
    all_livestock = db.query(Livestock).filter(
        Livestock.tank_id == tank_id,
        Livestock.is_archived == False,
    ).all()

    livestock = [
        l for l in all_livestock
        if (l.added_date is None or l.added_date <= target_date)
    ]

    alive = [
        l for l in livestock
        if l.status == "alive" or (l.removed_date is not None and l.removed_date > target_date)
    ]
    dead = [
        l for l in livestock
        if l.status == "dead" and l.removed_date is not None and l.removed_date <= target_date
    ]

    total_individuals = sum(l.quantity for l in alive)
    species_count = len(set(l.species_name for l in alive))
    type_diversity = len(set(l.type for l in alive))

    # --- Diseases at target_date ---
    all_diseases = db.query(DiseaseRecord).filter(DiseaseRecord.tank_id == tank_id).all()
    active_diseases = [
        d for d in all_diseases
        if d.detected_date <= target_date
        and d.status in ("active", "monitoring", "resolved", "chronic")
        and (d.resolved_date is None or d.resolved_date > target_date)
    ]

    # --- Livestock Health Score ---
    livestock_score = 100
    for d in active_diseases:
        severity_penalty = {"mild": 5, "moderate": 10, "severe": 20, "critical": 30}.get(d.severity, 10)
        livestock_score -= severity_penalty

    recent_dead = [l for l in dead if l.removed_date and (target_date - l.removed_date).days <= 90]
    livestock_score -= len(recent_dead) * 10

    if type_diversity >= 3 and livestock_score >= 80:
        livestock_score = min(100, livestock_score + 5)
    livestock_score = max(0, min(100, livestock_score))

    # --- Maintenance at target_date ---
    reminders = db.query(MaintenanceReminder).filter(
        MaintenanceReminder.tank_id == tank_id,
        MaintenanceReminder.is_active == True,
    ).all()

    maintenance_score = 100
    for r in reminders:
        # Skip reminders that didn't exist yet
        if r.created_at and r.created_at.date() > target_date:
            continue
        if r.next_due and r.next_due < target_date:
            days_overdue = (target_date - r.next_due).days
            maintenance_score -= min(days_overdue * 5, 20)
        elif r.last_completed and r.last_completed <= target_date:
            # Between last_completed and next_due: on schedule
            pass
    maintenance_score = max(0, min(100, maintenance_score))

    # --- Equipment at target_date ---
    equipment_list = db.query(Equipment).filter(Equipment.tank_id == tank_id).all()
    equipment_at_date = [e for e in equipment_list if e.created_at.date() <= target_date]

    equipment_score = 100
    for eq in equipment_at_date:
        if eq.condition == "failing":
            equipment_score -= 20
        elif eq.condition == "needs_maintenance":
            equipment_score -= 10
    equipment_score = max(0, min(100, equipment_score))

    # --- Parameter Stability (ICP-based for backfill) ---
    from app.models.icp_test import ICPTest
    latest_icp = db.query(ICPTest).filter(
        ICPTest.tank_id == tank_id,
        ICPTest.test_date <= target_date,
    ).order_by(ICPTest.test_date.desc()).first()

    parameter_score = 75
    if latest_icp and latest_icp.score_overall:
        parameter_score = latest_icp.score_overall
        if latest_icp.test_date:
            days_since_test = (target_date - latest_icp.test_date).days
            if days_since_test > 180:
                parameter_score -= 15
            elif days_since_test > 90:
                parameter_score -= 5
    parameter_score = max(0, min(100, parameter_score))

    # --- Water Chemistry (ICP) ---
    chemistry_score = 70
    if latest_icp:
        chemistry_score = latest_icp.score_overall or 70
        if latest_icp.test_date:
            days_since = (target_date - latest_icp.test_date).days
            if days_since <= 30:
                chemistry_score = min(100, chemistry_score + 5)
            elif days_since > 180:
                chemistry_score = max(0, chemistry_score - 10)
    elif tank.water_type == "freshwater":
        chemistry_score = 80
    chemistry_score = max(0, min(100, chemistry_score))

    # --- Maturity (age-based, no InfluxDB for historical) ---
    maturity_score = 50
    if tank.setup_date:
        from app.services.maturity import calculate_age_score
        age_days = (target_date - tank.setup_date).days
        if age_days >= 0:
            # Inline age score logic with target_date
            if age_days <= 30:
                age_s = round(5 * (age_days / 30))
            elif age_days <= 90:
                age_s = round(5 + 10 * ((age_days - 30) / 60))
            elif age_days <= 365:
                age_s = round(15 + 10 * ((age_days - 90) / 275))
            elif age_days <= 730:
                age_s = round(25 + 3 * ((age_days - 365) / 365))
            else:
                age_s = 30

            # Livestock score for maturity
            if species_count == 0:
                ls = 0
            elif species_count <= 2:
                ls = 3
            elif species_count <= 5:
                ls = 7
            elif species_count <= 10:
                ls = 11
            elif species_count <= 20:
                ls = 13
            else:
                ls = 15
            tc = type_diversity
            ts = {0: 0, 1: 3, 2: 7}.get(tc, 10)
            avg_q = (total_individuals / max(len(alive), 1)) if alive else 0
            if avg_q >= 3:
                ps = 5
            elif avg_q >= 2:
                ps = 3
            elif avg_q >= 1:
                ps = 1
            else:
                ps = 0

            maturity_score = min(age_s + ls + ts + ps, 100)
    maturity_score = max(0, min(100, maturity_score))

    # --- Overall ---
    overall_score = int(
        parameter_score * 0.20 +
        maintenance_score * 0.20 +
        livestock_score * 0.20 +
        equipment_score * 0.15 +
        maturity_score * 0.15 +
        chemistry_score * 0.10
    )
    overall_score = max(0, min(100, overall_score))

    return {
        "overall_score": overall_score,
        "overall_grade": _score_to_grade(overall_score),
        "parameter_stability_score": parameter_score,
        "maintenance_score": maintenance_score,
        "livestock_health_score": livestock_score,
        "equipment_score": equipment_score,
        "maturity_score": maturity_score,
        "water_chemistry_score": chemistry_score,
    }


def backfill_score_history(db: Session, tank_id: str, user_id: str) -> int:
    """Backfill weekly score snapshots from tank setup_date to yesterday.

    Returns the number of rows inserted/updated.
    """
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == user_id).first()
    if not tank or not tank.setup_date:
        return 0

    today = date.today()
    start = tank.setup_date
    count = 0
    current = start

    while current < today:
        scores = _compute_scores_at_date(db, tank_id, user_id, current)
        if scores:
            try:
                stmt = pg_insert(ScoreHistory).values(
                    tank_id=tank_id,
                    user_id=user_id,
                    recorded_at=current,
                    **scores,
                ).on_conflict_do_update(
                    constraint="uq_score_history_tank_day",
                    set_=scores,
                )
                db.execute(stmt)
                db.commit()
                count += 1
            except Exception:
                db.rollback()
        current += timedelta(days=7)

    return count


def compute_report_card(db: Session, tank_id: str, user_id: str) -> dict:
    """Compute the full report card for a tank."""
    today = date.today()

    # --- Fetch all data ---
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == user_id).first()
    if not tank:
        return None

    livestock = db.query(Livestock).filter(
        Livestock.tank_id == tank_id,
        Livestock.is_archived == False,
    ).all()

    reminders = db.query(MaintenanceReminder).filter(
        MaintenanceReminder.tank_id == tank_id,
        MaintenanceReminder.is_active == True,
    ).all()

    diseases = db.query(DiseaseRecord).filter(
        DiseaseRecord.tank_id == tank_id,
    ).all()

    equipment_list = db.query(Equipment).filter(
        Equipment.tank_id == tank_id,
    ).all()

    # --- 1. Maintenance Compliance (25%) ---
    maintenance_score = 100
    overdue_count = 0
    total_reminders = len(reminders)
    overdue_items = []

    for r in reminders:
        if r.next_due and r.next_due < today:
            days_overdue = (today - r.next_due).days
            overdue_count += 1
            overdue_items.append({"title": r.title, "days_overdue": days_overdue})
            # Penalty: -5 per overdue day, capped at -20 per reminder
            maintenance_score -= min(days_overdue * 5, 20)

    maintenance_score = max(0, min(100, maintenance_score))

    # --- 2. Livestock Health (20%) ---
    livestock_score = 100
    alive = [l for l in livestock if l.status == "alive"]
    dead = [l for l in livestock if l.status == "dead"]
    total_individuals = sum(l.quantity for l in alive)
    species_count = len(set(l.species_name for l in alive))
    type_diversity = len(set(l.type for l in alive))

    active_diseases = [d for d in diseases if d.status in ("active", "monitoring")]
    resolved_diseases = [d for d in diseases if d.status == "resolved"]

    # Penalties for active diseases
    for d in active_diseases:
        severity_penalty = {"mild": 5, "moderate": 10, "severe": 20, "critical": 30}.get(d.severity, 10)
        livestock_score -= severity_penalty

    # Penalty for recent deaths (last 90 days)
    recent_dead = [l for l in dead if l.removed_date and (today - l.removed_date).days <= 90]
    livestock_score -= len(recent_dead) * 10

    # Bonus for diversity (if no problems)
    if type_diversity >= 3 and livestock_score >= 80:
        livestock_score = min(100, livestock_score + 5)

    livestock_score = max(0, min(100, livestock_score))

    # --- 3. Equipment Status (15%) ---
    equipment_score = 100
    failing_equipment = []
    for eq in equipment_list:
        if eq.condition == "failing":
            equipment_score -= 20
            failing_equipment.append(eq.name)
        elif eq.condition == "needs_maintenance":
            equipment_score -= 10

    # Bonus for having critical equipment types
    eq_types = set(e.equipment_type for e in equipment_list if e.status == "active")
    critical_types = {"pump", "heater", "filter", "light"}
    # For saltwater, skimmer is also critical
    if tank.water_type == "saltwater":
        critical_types.add("skimmer")

    equipment_score = max(0, min(100, equipment_score))

    # --- 4. Parameter Stability (20%) ---
    parameter_score = 75  # Default baseline

    from app.models.icp_test import ICPTest
    latest_icp = db.query(ICPTest).filter(
        ICPTest.tank_id == tank_id,
    ).order_by(ICPTest.test_date.desc()).first()

    if latest_icp and latest_icp.score_overall:
        parameter_score = latest_icp.score_overall
        if latest_icp.test_date:
            days_since_test = (today - latest_icp.test_date).days
            if days_since_test > 180:
                parameter_score -= 15
            elif days_since_test > 90:
                parameter_score -= 5

    # Use InfluxDB stability data if available
    try:
        from app.services.maturity import calculate_stability_scores_batch
        stability_results = calculate_stability_scores_batch(
            user_id,
            {str(tank.id): tank.water_type or "saltwater"},
        )
        raw_stability = stability_results.get(str(tank.id), 0)
        if raw_stability > 0:
            stability_normalized = int((raw_stability / 40) * 100)
            if latest_icp and latest_icp.score_overall:
                parameter_score = int(parameter_score * 0.5 + stability_normalized * 0.5)
            else:
                parameter_score = stability_normalized
    except Exception:
        pass

    parameter_score = max(0, min(100, parameter_score))

    # --- 5. Water Chemistry / ICP Score (15%) ---
    chemistry_score = 70  # Default baseline
    if latest_icp:
        chemistry_score = latest_icp.score_overall or 70
        # Freshness bonus/penalty
        if latest_icp.test_date:
            days_since = (today - latest_icp.test_date).days
            if days_since <= 30:
                chemistry_score = min(100, chemistry_score + 5)
            elif days_since > 180:
                chemistry_score = max(0, chemistry_score - 10)
    elif tank.water_type == "freshwater":
        # Freshwater tanks typically don't do ICP tests, don't penalize
        chemistry_score = 80

    chemistry_score = max(0, min(100, chemistry_score))

    # --- 6. Tank Maturity (15%) ---
    maturity_score = 50  # Default baseline
    maturity_data = None
    try:
        from app.services.maturity import compute_maturity_batch
        maturity_results = compute_maturity_batch(
            db, user_id,
            [(tank.id, tank.setup_date, tank.water_type or "saltwater")]
        )
        ms = maturity_results.get(str(tank.id))
        if ms and ms.get("score", 0) > 0:
            maturity_score = ms["score"]
            maturity_data = ms
    except Exception:
        pass

    maturity_score = max(0, min(100, maturity_score))

    # --- Overall Score (weighted) ---
    overall_score = int(
        parameter_score * 0.20 +
        maintenance_score * 0.20 +
        livestock_score * 0.20 +
        equipment_score * 0.15 +
        maturity_score * 0.15 +
        chemistry_score * 0.10
    )
    overall_score = max(0, min(100, overall_score))

    # --- Achievements ---
    achievements = []

    # Tank age milestones
    if tank.setup_date:
        tank_age_days = (today - tank.setup_date).days
        if tank_age_days >= 730:
            achievements.append({"key": "veteran", "icon": "🏆", "label": "Veteran Tank", "detail": f"{tank_age_days // 365} years running"})
        elif tank_age_days >= 365:
            achievements.append({"key": "one_year", "icon": "🎂", "label": "1 Year Club", "detail": f"{tank_age_days} days and counting"})
        elif tank_age_days >= 180:
            achievements.append({"key": "six_months", "icon": "⭐", "label": "6 Month Mark", "detail": f"{tank_age_days} days established"})

    # Disease-free
    if not active_diseases:
        if diseases:
            last_resolved = max((d.resolved_date for d in diseases if d.resolved_date), default=None)
            if last_resolved:
                disease_free_days = (today - last_resolved).days
                if disease_free_days >= 90:
                    achievements.append({"key": "disease_free", "icon": "🛡️", "label": "Disease Free", "detail": f"{disease_free_days} days clear"})
        else:
            achievements.append({"key": "pristine", "icon": "✨", "label": "Pristine Health", "detail": "No disease history"})

    # Maintenance streak
    if overdue_count == 0 and total_reminders >= 3:
        achievements.append({"key": "diligent", "icon": "🔧", "label": "Diligent Keeper", "detail": "All maintenance on schedule"})

    # Biodiversity
    if species_count >= 10:
        achievements.append({"key": "biodiversity", "icon": "🌊", "label": "Biodiversity Champion", "detail": f"{species_count} species thriving"})
    elif species_count >= 5:
        achievements.append({"key": "diverse", "icon": "🐠", "label": "Diverse Ecosystem", "detail": f"{species_count} species"})

    # ICP testing
    if latest_icp and latest_icp.score_overall and latest_icp.score_overall >= 90:
        achievements.append({"key": "lab_tested", "icon": "🔬", "label": "Lab Tested", "detail": f"ICP score: {latest_icp.score_overall}/100"})

    # High overall score
    if overall_score >= 95:
        achievements.append({"key": "elite", "icon": "💎", "label": "Elite Aquarist", "detail": "Top-tier tank health"})

    # --- Insights / Recommendations ---
    insights = []

    if overdue_count > 0:
        insights.append({
            "type": "warning",
            "message": f"{overdue_count} maintenance task{'s' if overdue_count > 1 else ''} overdue",
        })

    if active_diseases:
        insights.append({
            "type": "alert",
            "message": f"{len(active_diseases)} active disease{'s' if len(active_diseases) > 1 else ''} requiring attention",
        })

    if failing_equipment:
        insights.append({
            "type": "alert",
            "message": f"Equipment failing: {', '.join(failing_equipment)}",
        })

    if tank.water_type == "saltwater" and (not latest_icp or (latest_icp.test_date and (today - latest_icp.test_date).days > 90)):
        insights.append({
            "type": "info",
            "message": "Consider scheduling an ICP test for comprehensive water analysis",
        })

    if total_individuals == 0:
        insights.append({
            "type": "info",
            "message": "No livestock recorded — add your inhabitants to improve scoring",
        })

    if total_reminders == 0:
        insights.append({
            "type": "info",
            "message": "Set up maintenance reminders to track your routine",
        })

    if overall_score >= 90 and not insights:
        insights.append({
            "type": "success",
            "message": "Your tank is in excellent condition — keep it up!",
        })

    # --- Record score snapshot (once per day per tank) ---
    try:
        stmt = pg_insert(ScoreHistory).values(
            tank_id=tank_id,
            user_id=user_id,
            recorded_at=today,
            overall_score=overall_score,
            overall_grade=_score_to_grade(overall_score),
            parameter_stability_score=parameter_score,
            maintenance_score=maintenance_score,
            livestock_health_score=livestock_score,
            equipment_score=equipment_score,
            maturity_score=maturity_score,
            water_chemistry_score=chemistry_score,
        ).on_conflict_do_update(
            constraint="uq_score_history_tank_day",
            set_={
                "overall_score": overall_score,
                "overall_grade": _score_to_grade(overall_score),
                "parameter_stability_score": parameter_score,
                "maintenance_score": maintenance_score,
                "livestock_health_score": livestock_score,
                "equipment_score": equipment_score,
                "maturity_score": maturity_score,
                "water_chemistry_score": chemistry_score,
            },
        )
        db.execute(stmt)
        db.commit()
    except Exception:
        db.rollback()

    return {
        "overall_score": overall_score,
        "overall_grade": _score_to_grade(overall_score),
        "status": _score_to_status(overall_score),
        "categories": {
            "parameter_stability": {
                "score": parameter_score,
                "grade": _score_to_grade(parameter_score),
                "weight": 20,
            },
            "maintenance": {
                "score": maintenance_score,
                "grade": _score_to_grade(maintenance_score),
                "weight": 20,
            },
            "livestock_health": {
                "score": livestock_score,
                "grade": _score_to_grade(livestock_score),
                "weight": 20,
            },
            "equipment": {
                "score": equipment_score,
                "grade": _score_to_grade(equipment_score),
                "weight": 15,
            },
            "maturity": {
                "score": maturity_score,
                "grade": _score_to_grade(maturity_score),
                "weight": 15,
            },
            "water_chemistry": {
                "score": chemistry_score,
                "grade": _score_to_grade(chemistry_score),
                "weight": 10,
            },
        },
        "maturity": maturity_data,
        "stats": {
            "total_livestock": total_individuals,
            "species_count": species_count,
            "type_diversity": type_diversity,
            "active_diseases": len(active_diseases),
            "overdue_maintenance": overdue_count,
            "total_reminders": total_reminders,
            "equipment_count": len(equipment_list),
            "failing_equipment": len(failing_equipment),
        },
        "achievements": achievements,
        "insights": insights,
    }
