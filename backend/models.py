from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Inventory(Base):
    __tablename__ = "inventories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    item_code: Mapped[str] = mapped_column(String(100), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    item_condition: Mapped[str] = mapped_column(String(50), default="Good")
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    def to_dict(self):
        return {
            "id": self.id,
            "itemCode": self.item_code,
            "name": self.name,
            "category": self.category,
            "stock": self.stock,
            "itemCondition": self.item_condition,
            "isAvailable": self.is_available,
        }


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id_number: Mapped[str] = mapped_column(String(50))
    inventory_id: Mapped[int] = mapped_column(ForeignKey("inventories.id"))
    # "active", "returned", "overdue", "accountability_case"
    status: Mapped[str] = mapped_column(String(50), default="active")
    borrowed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    expected_return_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    returned_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    item: Mapped[Inventory] = relationship()

    def to_dict(self):
        return {
            "id": self.id,
            "userIdNumber": self.user_id_number,
            "item": self.item.to_dict(),
            "status": self.status,
            "borrowedAt": self.borrowed_at.isoformat() if self.borrowed_at else None,
            "expectedReturnDate": self.expected_return_date.isoformat() if self.expected_return_date else None,
            "returnedAt": self.returned_at.isoformat() if self.returned_at else None,
        }


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    message: Mapped[str] = mapped_column(String(500))
    type: Mapped[str] = mapped_column(String(50), default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)