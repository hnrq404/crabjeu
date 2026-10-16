from datetime import datetime
from pydantic import BaseModel, Field


class ProfileOut(BaseModel):
    id: str
    name: str
    avatar_key: str | None = None


class LoginIn(BaseModel):
    profile_id: str
    pin: str = Field(min_length=4, max_length=12)


class LoginOut(BaseModel):
    token: str
    user: dict


class AttemptIn(BaseModel):
    attempt_id: str
    activity_id: str
    selected_answer: str
    score: float
    completed_at: datetime


class SyncAttemptsIn(BaseModel):
    student_id: str
    offline_attempts: list[AttemptIn]


class SyncAttemptsOut(BaseModel):
    status: str
    synced_records: int
    duplicated_records: int
    server_timestamp: datetime
