"""
Finances API Endpoints

Aggregation endpoints for spending analysis and budget management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import math
from datetime import datetime
from collections import defaultdict

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.models.equipment import Equipment
from app.models.consumable import Consumable
from app.models.livestock import Livestock
from app.models.icp_test import ICPTest
from app.models.budget import Budget
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetStatus
from app.schemas.finance import FinanceSummary, CategorySpending, TankSpending, MonthlySpending, ExpenseDetail, ExpenseDetailList
from app.api.deps import get_current_user
from app.utils.price import parse_price

router = APIRouter()


# ---- Helper: collect all cost items ----

def _collect_costs(db: Session, user_id, tank_id: Optional[UUID] = None):
    """Gather all items with prices from the four source tables."""
    items = []  # list of (category, tank_id, date, parsed_price)

    # Equipment
    q = db.query(Equipment).filter(Equipment.user_id == user_id)
    if tank_id:
        q = q.filter(Equipment.tank_id == tank_id)
    for e in q.all():
        price = parse_price(e.purchase_price)
        if price is not None and price > 0:
            items.append(("equipment", e.tank_id, e.purchase_date, price))

    # Consumables
    q = db.query(Consumable).filter(Consumable.user_id == user_id)
    if tank_id:
        q = q.filter(Consumable.tank_id == tank_id)
    for c in q.all():
        price = parse_price(c.purchase_price)
        if price is not None and price > 0:
            items.append(("consumables", c.tank_id, c.purchase_date, price))

    # Livestock
    q = db.query(Livestock).filter(Livestock.user_id == user_id)
    if tank_id:
        q = q.filter(Livestock.tank_id == tank_id)
    for l in q.all():
        price = parse_price(l.purchase_price)
        if price is not None and price > 0:
            items.append(("livestock", l.tank_id, l.added_date, price))

    # ICP Tests
    q = db.query(ICPTest).filter(ICPTest.user_id == user_id)
    if tank_id:
        q = q.filter(ICPTest.tank_id == tank_id)
    for t in q.all():
        price = parse_price(t.cost)
        if price is not None and price > 0:
            items.append(("icp_tests", t.tank_id, t.test_date, price))

    return items


# ---- Aggregation Endpoints ----

@router.get("/summary", response_model=FinanceSummary)
def get_finance_summary(
    tank_id: Optional[UUID] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get complete financial summary with breakdowns."""
    items = _collect_costs(db, current_user.id, tank_id)

    # Category totals
    cat_totals = defaultdict(lambda: {"total": 0.0, "count": 0})
    for cat, _, _, price in items:
        cat_totals[cat]["total"] += price
        cat_totals[cat]["count"] += 1

    total_equipment = cat_totals["equipment"]["total"]
    total_consumables = cat_totals["consumables"]["total"]
    total_livestock = cat_totals["livestock"]["total"]
    total_icp = cat_totals["icp_tests"]["total"]
    total_spent = total_equipment + total_consumables + total_livestock + total_icp

    by_category = [
        CategorySpending(category=cat, total=d["total"], count=d["count"])
        for cat, d in cat_totals.items()
        if d["total"] > 0
    ]

    # By tank
    tank_data = defaultdict(lambda: {"equipment": 0.0, "consumables": 0.0, "livestock": 0.0, "icp_tests": 0.0})
    for cat, tid, _, price in items:
        tank_data[tid][cat] += price

    tank_names = {}
    if tank_data:
        tanks = db.query(Tank).filter(Tank.user_id == current_user.id).all()
        tank_names = {t.id: t.name for t in tanks}

    by_tank = []
    for tid, d in tank_data.items():
        total = d["equipment"] + d["consumables"] + d["livestock"] + d["icp_tests"]
        by_tank.append(TankSpending(
            tank_id=tid,
            tank_name=tank_names.get(tid, "Unknown"),
            total=total,
            **d,
        ))
    by_tank.sort(key=lambda x: x.total, reverse=True)

    # Monthly breakdown
    monthly_data = defaultdict(lambda: {"equipment": 0.0, "consumables": 0.0, "livestock": 0.0, "icp_tests": 0.0})
    for cat, _, dt, price in items:
        if dt:
            key = (dt.year, dt.month)
            monthly_data[key][cat] += price

    monthly = []
    cumulative = 0.0
    for (year, month) in sorted(monthly_data.keys()):
        d = monthly_data[(year, month)]
        total = d["equipment"] + d["consumables"] + d["livestock"] + d["icp_tests"]
        cumulative += total
        monthly.append(MonthlySpending(
            year=year,
            month=month,
            label=f"{year}-{month:02d}",
            total=round(total, 2),
            equipment=round(d["equipment"], 2),
            consumables=round(d["consumables"], 2),
            livestock=round(d["livestock"], 2),
            icp_tests=round(d["icp_tests"], 2),
            cumulative=round(cumulative, 2),
        ))

    return FinanceSummary(
        total_spent=round(total_spent, 2),
        total_equipment=round(total_equipment, 2),
        total_consumables=round(total_consumables, 2),
        total_livestock=round(total_livestock, 2),
        total_icp_tests=round(total_icp, 2),
        by_category=by_category,
        by_tank=by_tank,
        monthly=monthly,
    )


@router.get("/monthly", response_model=List[MonthlySpending])
def get_monthly_spending(
    tank_id: Optional[UUID] = Query(None),
    year: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get monthly spending with cumulative totals."""
    items = _collect_costs(db, current_user.id, tank_id)

    monthly_data = defaultdict(lambda: {"equipment": 0.0, "consumables": 0.0, "livestock": 0.0, "icp_tests": 0.0})
    for cat, _, dt, price in items:
        if dt:
            if year and dt.year != year:
                continue
            key = (dt.year, dt.month)
            monthly_data[key][cat] += price

    monthly = []
    cumulative = 0.0
    for (y, m) in sorted(monthly_data.keys()):
        d = monthly_data[(y, m)]
        total = d["equipment"] + d["consumables"] + d["livestock"] + d["icp_tests"]
        cumulative += total
        monthly.append(MonthlySpending(
            year=y, month=m, label=f"{y}-{m:02d}",
            total=round(total, 2),
            equipment=round(d["equipment"], 2),
            consumables=round(d["consumables"], 2),
            livestock=round(d["livestock"], 2),
            icp_tests=round(d["icp_tests"], 2),
            cumulative=round(cumulative, 2),
        ))

    return monthly


# ---- Budget CRUD ----

@router.post("/budgets", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if budget.tank_id:
        tank = db.query(Tank).filter(Tank.id == budget.tank_id, Tank.user_id == current_user.id).first()
        if not tank:
            raise HTTPException(status_code=404, detail="Tank not found")

    db_budget = Budget(
        user_id=current_user.id,
        tank_id=budget.tank_id,
        name=budget.name,
        amount=budget.amount,
        currency=budget.currency,
        period=budget.period,
        category=budget.category,
        is_active=budget.is_active,
        notes=budget.notes,
    )
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget


@router.get("/budgets", response_model=List[BudgetResponse])
def list_budgets(
    tank_id: Optional[UUID] = Query(None),
    active_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Budget).filter(Budget.user_id == current_user.id)
    if tank_id:
        q = q.filter(Budget.tank_id == tank_id)
    if active_only:
        q = q.filter(Budget.is_active == True)
    return q.order_by(Budget.created_at.desc()).all()


@router.get("/budgets/status", response_model=List[BudgetStatus])
def get_budget_statuses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all active budgets with current spending status."""
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.is_active == True,
    ).all()

    now = datetime.utcnow()
    results = []

    for b in budgets:
        items = _collect_costs(db, current_user.id, b.tank_id)

        # Filter by category if set
        if b.category:
            items = [i for i in items if i[0] == b.category]

        # Filter by period
        spent = 0.0
        for _, _, dt, price in items:
            if not dt:
                continue
            if b.period == "monthly" and dt.year == now.year and dt.month == now.month:
                spent += price
            elif b.period == "yearly" and dt.year == now.year:
                spent += price

        remaining = b.amount - spent
        pct = (spent / b.amount * 100) if b.amount > 0 else 0

        results.append(BudgetStatus(
            budget=BudgetResponse.model_validate(b),
            spent=round(spent, 2),
            remaining=round(remaining, 2),
            percentage_used=round(pct, 1),
            is_over_budget=spent > b.amount,
        ))

    return results


@router.get("/budgets/{budget_id}", response_model=BudgetResponse)
def get_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
    return b


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: UUID,
    budget_update: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")

    update_data = budget_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(b, key, value)

    db.commit()
    db.refresh(b)
    return b


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(b)
    db.commit()


# ---- Expense Details ----

def _collect_expense_details(db: Session, user_id, tank_id=None, category=None):
    """Gather individual expense items with full detail."""
    details = []
    tank_names = {}
    tanks = db.query(Tank).filter(Tank.user_id == user_id).all()
    tank_names = {t.id: t.name for t in tanks}

    if not category or category == "equipment":
        q = db.query(Equipment).filter(Equipment.user_id == user_id)
        if tank_id:
            q = q.filter(Equipment.tank_id == tank_id)
        for e in q.all():
            price = parse_price(e.purchase_price)
            details.append(ExpenseDetail(
                id=e.id, name=e.name, category="equipment",
                tank_id=e.tank_id, tank_name=tank_names.get(e.tank_id, "Unknown"),
                date=str(e.purchase_date) if e.purchase_date else None, price=price,
                price_raw=e.purchase_price,
                purchase_url=getattr(e, "purchase_url", None),
            ))

    if not category or category == "consumables":
        q = db.query(Consumable).filter(Consumable.user_id == user_id)
        if tank_id:
            q = q.filter(Consumable.tank_id == tank_id)
        for c in q.all():
            price = parse_price(c.purchase_price)
            details.append(ExpenseDetail(
                id=c.id, name=c.name, category="consumables",
                tank_id=c.tank_id, tank_name=tank_names.get(c.tank_id, "Unknown"),
                date=str(c.purchase_date) if c.purchase_date else None, price=price,
                price_raw=c.purchase_price,
                purchase_url=getattr(c, "purchase_url", None),
            ))

    if not category or category == "livestock":
        q = db.query(Livestock).filter(Livestock.user_id == user_id)
        if tank_id:
            q = q.filter(Livestock.tank_id == tank_id)
        for l in q.all():
            price = parse_price(l.purchase_price)
            details.append(ExpenseDetail(
                id=l.id, name=l.species_name, category="livestock",
                tank_id=l.tank_id, tank_name=tank_names.get(l.tank_id, "Unknown"),
                date=str(l.added_date) if l.added_date else None, price=price,
                price_raw=l.purchase_price,
                purchase_url=getattr(l, "purchase_url", None),
            ))

    if not category or category == "icp_tests":
        q = db.query(ICPTest).filter(ICPTest.user_id == user_id)
        if tank_id:
            q = q.filter(ICPTest.tank_id == tank_id)
        for t in q.all():
            price = parse_price(t.cost)
            details.append(ExpenseDetail(
                id=t.id, name=t.lab_name or "ICP Test",
                category="icp_tests",
                tank_id=t.tank_id, tank_name=tank_names.get(t.tank_id, "Unknown"),
                date=str(t.test_date) if t.test_date else None, price=price,
                price_raw=t.cost, purchase_url=None,
            ))

    # Sort by date descending (nulls last)
    details.sort(key=lambda d: d.date or "0000-01-01", reverse=True)
    return details


@router.get("/details", response_model=ExpenseDetailList)
def get_expense_details(
    tank_id: Optional[UUID] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated list of individual expense items."""
    all_items = _collect_expense_details(db, current_user.id, tank_id, category)
    total = len(all_items)
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    start = (page - 1) * page_size
    items = all_items[start:start + page_size]

    return ExpenseDetailList(
        items=items, total=total,
        page=page, page_size=page_size, total_pages=total_pages,
    )


@router.patch("/details/{item_id}/price")
def update_expense_price(
    item_id: UUID,
    category: str = Query(...),
    price: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the price of an individual expense item."""
    model_map = {
        "equipment": (Equipment, "purchase_price"),
        "consumables": (Consumable, "purchase_price"),
        "livestock": (Livestock, "purchase_price"),
        "icp_tests": (ICPTest, "cost"),
    }

    if category not in model_map:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    Model, price_field = model_map[category]
    item = db.query(Model).filter(Model.id == item_id, Model.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    setattr(item, price_field, price)
    db.commit()
    return {"ok": True, "id": str(item_id), "price": price}
