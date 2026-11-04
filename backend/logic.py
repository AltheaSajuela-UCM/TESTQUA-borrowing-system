from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Inventory, Transaction


def get_dashboard_metrics(db: Session) -> dict:
    total_items = db.query(func.coalesce(func.sum(Inventory.stock), 0)).scalar()
    academic_count = (
        db.query(func.coalesce(func.sum(Inventory.stock), 0))
        .filter(Inventory.category == "Academic")
        .scalar()
    )
    active = db.query(Transaction).filter(Transaction.status == "active").count()

    total_items = int(total_items)
    academic_count = int(academic_count)

    return {
        "totalItems": total_items,
        "activeTransactions": active,
        "academicPct": round(academic_count / total_items * 100) if total_items > 0 else 0,
        "nonAcademicPct": round((total_items - academic_count) / total_items * 100) if total_items > 0 else 0,
    }


def process_borrow(db: Session, user_id_number: str, item_id: int, return_date: datetime) -> Transaction:
    item = db.get(Inventory, item_id)
    if item is None:
        raise ValueError("Item missing from stock lists.")
    if not item.is_available or item.stock < 1:
        raise ValueError("Item is depleted or unavailable.")

    item.stock -= 1
    if item.stock == 0:
        item.is_available = False

    tx = Transaction(
        user_id_number=user_id_number,
        item=item,
        expected_return_date=return_date,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx