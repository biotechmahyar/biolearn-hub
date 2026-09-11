"""Product + Order models."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid():
    return uuid.uuid4().hex


class Product(Base):
    __tablename__ = "products"

    id = Column(String(32), primary_key=True, default=_uuid)
    title = Column(String(500), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, default="")
    price = Column(Integer, default=0)
    coverImage = Column(String(1000), default="")
    category = Column(String(255), default="")
    published = Column(Boolean, default=False)
    featured = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(32), primary_key=True, default=_uuid)
    userId = Column(String(32), ForeignKey("users.id"), nullable=False)
    invoiceNumber = Column(String(50), unique=True, nullable=False)
    subtotal = Column(Integer, default=0)
    discountAmount = Column(Integer, default=0)
    total = Column(Integer, default=0)
    status = Column(String(20), default="pending")  # pending / paid / cancelled
    createdAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(32), primary_key=True, default=_uuid)
    orderId = Column(String(32), ForeignKey("orders.id"), nullable=False)
    type = Column(String(50), nullable=False)  # course / product / workshop
    refId = Column(String(32), nullable=True)
    title = Column(String(500), default="")
    price = Column(Integer, default=0)

    order = relationship("Order", back_populates="items")
