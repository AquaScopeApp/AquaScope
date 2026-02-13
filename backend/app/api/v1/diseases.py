"""
Disease/Health Tracking API Endpoints

Handles disease records and treatment logs for livestock.
"""
from typing import List, Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.models.livestock import Livestock
from app.models.disease import DiseaseRecord, DiseaseTreatment
from app.models.consumable import Consumable, ConsumableUsage
from app.schemas.disease import (
    DiseaseRecordCreate,
    DiseaseRecordUpdate,
    DiseaseRecordResponse,
    DiseaseRecordDetailResponse,
    DiseaseTreatmentCreate,
    DiseaseTreatmentResponse,
    DiseaseHealthSummary,
)
from app.api.deps import get_current_user

router = APIRouter()


# ============================================================================
# Disease Records
# ============================================================================

@router.post("/", response_model=DiseaseRecordResponse, status_code=status.HTTP_201_CREATED)
def create_disease(
    disease_in: DiseaseRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new disease record."""
    # Verify livestock ownership
    livestock = db.query(Livestock).filter(
        Livestock.id == disease_in.livestock_id,
        Livestock.user_id == current_user.id
    ).first()
    if not livestock:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livestock not found")

    # Verify tank ownership
    tank = db.query(Tank).filter(
        Tank.id == disease_in.tank_id,
        Tank.user_id == current_user.id
    ).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")

    data = disease_in.model_dump()
    disease = DiseaseRecord(**data, user_id=current_user.id)
    db.add(disease)
    db.commit()
    db.refresh(disease)
    return disease


@router.get("/", response_model=List[DiseaseRecordResponse])
def list_diseases(
    tank_id: Optional[UUID] = Query(None, description="Filter by tank ID"),
    livestock_id: Optional[UUID] = Query(None, description="Filter by livestock ID"),
    disease_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List disease records with optional filtering."""
    query = db.query(DiseaseRecord).filter(
        DiseaseRecord.user_id == current_user.id
    )

    if tank_id:
        tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == current_user.id).first()
        if not tank:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")
        query = query.filter(DiseaseRecord.tank_id == tank_id)

    if livestock_id:
        query = query.filter(DiseaseRecord.livestock_id == livestock_id)

    if disease_status:
        query = query.filter(DiseaseRecord.status == disease_status)

    if severity:
        query = query.filter(DiseaseRecord.severity == severity)

    return query.order_by(DiseaseRecord.detected_date.desc()).all()


@router.get("/summary", response_model=DiseaseHealthSummary)
def get_health_summary(
    tank_id: UUID = Query(..., description="Tank ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get health summary for a tank."""
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == current_user.id).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")

    base = db.query(DiseaseRecord).filter(
        DiseaseRecord.tank_id == tank_id,
        DiseaseRecord.user_id == current_user.id
    )

    active_count = base.filter(DiseaseRecord.status == "active").count()
    monitoring_count = base.filter(DiseaseRecord.status == "monitoring").count()
    chronic_count = base.filter(DiseaseRecord.status == "chronic").count()
    resolved_count = base.filter(DiseaseRecord.status == "resolved").count()

    total_treatments = db.query(func.count(DiseaseTreatment.id)).join(DiseaseRecord).filter(
        DiseaseRecord.tank_id == tank_id,
        DiseaseRecord.user_id == current_user.id
    ).scalar() or 0

    recent = base.order_by(DiseaseRecord.detected_date.desc()).limit(5).all()

    return DiseaseHealthSummary(
        tank_id=tank_id,
        active_count=active_count,
        monitoring_count=monitoring_count,
        chronic_count=chronic_count,
        resolved_count=resolved_count,
        total_treatments=total_treatments,
        recent_diseases=recent,
    )


@router.get("/{disease_id}", response_model=DiseaseRecordDetailResponse)
def get_disease(
    disease_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a disease record with its treatments."""
    disease = db.query(DiseaseRecord).filter(
        DiseaseRecord.id == disease_id,
        DiseaseRecord.user_id == current_user.id
    ).first()
    if not disease:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disease record not found")
    return disease


@router.put("/{disease_id}", response_model=DiseaseRecordResponse)
def update_disease(
    disease_id: UUID,
    disease_in: DiseaseRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a disease record."""
    disease = db.query(DiseaseRecord).filter(
        DiseaseRecord.id == disease_id,
        DiseaseRecord.user_id == current_user.id
    ).first()
    if not disease:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disease record not found")

    update_data = disease_in.model_dump(exclude_unset=True)

    # Auto-set resolved_date when status changes to resolved
    if update_data.get("status") == "resolved" and not disease.resolved_date and not update_data.get("resolved_date"):
        update_data["resolved_date"] = date.today()

    for field, value in update_data.items():
        setattr(disease, field, value)

    db.commit()
    db.refresh(disease)
    return disease


@router.delete("/{disease_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_disease(
    disease_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a disease record and all its treatments."""
    disease = db.query(DiseaseRecord).filter(
        DiseaseRecord.id == disease_id,
        DiseaseRecord.user_id == current_user.id
    ).first()
    if not disease:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disease record not found")
    db.delete(disease)
    db.commit()
    return None


# ============================================================================
# Disease Treatments
# ============================================================================

@router.post("/{disease_id}/treatments", response_model=DiseaseTreatmentResponse, status_code=status.HTTP_201_CREATED)
def add_treatment(
    disease_id: UUID,
    treatment_in: DiseaseTreatmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a treatment to a disease record."""
    disease = db.query(DiseaseRecord).filter(
        DiseaseRecord.id == disease_id,
        DiseaseRecord.user_id == current_user.id
    ).first()
    if not disease:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Disease record not found")

    # Verify consumable ownership if provided
    if treatment_in.consumable_id:
        consumable = db.query(Consumable).filter(
            Consumable.id == treatment_in.consumable_id,
            Consumable.user_id == current_user.id
        ).first()
        if not consumable:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consumable not found")

    data = treatment_in.model_dump()
    treatment = DiseaseTreatment(**data, disease_record_id=disease_id, user_id=current_user.id)
    db.add(treatment)

    # Deduct from consumable stock if linked
    if treatment_in.consumable_id and treatment_in.quantity_used:
        consumable = db.query(Consumable).filter(
            Consumable.id == treatment_in.consumable_id
        ).first()
        if consumable:
            usage = ConsumableUsage(
                consumable_id=consumable.id,
                user_id=current_user.id,
                usage_date=treatment_in.treatment_date,
                quantity_used=treatment_in.quantity_used,
                quantity_unit=treatment_in.quantity_unit,
                notes=f"Treatment: {treatment_in.treatment_name}",
            )
            db.add(usage)

            if consumable.quantity_on_hand is not None:
                consumable.quantity_on_hand = max(0, consumable.quantity_on_hand - treatment_in.quantity_used)
                if consumable.quantity_on_hand <= 0:
                    consumable.status = "depleted"
                elif consumable.quantity_on_hand < treatment_in.quantity_used * 3:
                    consumable.status = "low_stock"

    db.commit()
    db.refresh(treatment)
    return treatment


@router.put("/{disease_id}/treatments/{treatment_id}", response_model=DiseaseTreatmentResponse)
def update_treatment(
    disease_id: UUID,
    treatment_id: UUID,
    treatment_in: DiseaseTreatmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a treatment."""
    treatment = db.query(DiseaseTreatment).filter(
        DiseaseTreatment.id == treatment_id,
        DiseaseTreatment.disease_record_id == disease_id,
        DiseaseTreatment.user_id == current_user.id
    ).first()
    if not treatment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment not found")

    update_data = treatment_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(treatment, field, value)

    db.commit()
    db.refresh(treatment)
    return treatment


@router.delete("/{disease_id}/treatments/{treatment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_treatment(
    disease_id: UUID,
    treatment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a treatment."""
    treatment = db.query(DiseaseTreatment).filter(
        DiseaseTreatment.id == treatment_id,
        DiseaseTreatment.disease_record_id == disease_id,
        DiseaseTreatment.user_id == current_user.id
    ).first()
    if not treatment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treatment not found")
    db.delete(treatment)
    db.commit()
    return None
