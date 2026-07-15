import uuid
from datetime import date as datetime_date, datetime
from typing import Optional, List, Dict
from sqlmodel import SQLModel, Field, Relationship
from pydantic import ConfigDict

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    clerk_user_id: str = Field(unique=True, index=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationships
    sessions: List["ScrollSession"] = Relationship(back_populates="user")


class ScrollSession(SQLModel, table=True):
    __tablename__ = "scroll_sessions"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False, index=True)
    session_id: uuid.UUID = Field(unique=True, index=True, nullable=False)
    site: str = Field(index=True, nullable=False)
    duration_seconds: int = Field(nullable=False)
    distance_cm: int = Field(nullable=False)
    date: datetime_date = Field(index=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    # Relationships
    user: User = Relationship(back_populates="sessions")


# Pydantic Schemas for requests and responses
class ScrollSessionCreate(SQLModel):
    session_id: uuid.UUID
    site: str
    duration_seconds: int
    distance_cm: int
    date: datetime_date


class DailyMetric(SQLModel):
    date: datetime_date
    distance_m: float
    duration_min: float


class MetricsResponse(SQLModel):
    model_config = ConfigDict(populate_by_name=True, populate_by_field_name=True)

    from_date: datetime_date = Field(serialization_alias="from", validation_alias="from")
    to_date: datetime_date = Field(serialization_alias="to", validation_alias="to")
    data: Dict[str, List[DailyMetric]]
    totals: Dict[str, float]
