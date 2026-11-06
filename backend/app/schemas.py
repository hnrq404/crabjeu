from datetime import datetime

from pydantic import BaseModel, Field

USERNAME_PATTERN = r"^[A-Za-z0-9_.]{3,20}$"


class RegisterIn(BaseModel):
    username: str = Field(pattern=USERNAME_PATTERN)
    password: str = Field(min_length=4, max_length=64)
    avatar_key: str | None = Field(default=None, max_length=80)


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=64)


class UserOut(BaseModel):
    id: str
    username: str
    role: str
    avatar_key: str | None = None
    coins: int = 0
    level: int = 0
    earned_activity_ids: list[str] = []


class LoginOut(BaseModel):
    token: str
    user: UserOut


class UpdateMeIn(BaseModel):
    username: str | None = Field(default=None, pattern=USERNAME_PATTERN)
    avatar_key: str | None = Field(default=None, max_length=80)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=64)
    new_password: str = Field(min_length=4, max_length=64)


class AttemptIn(BaseModel):
    attempt_id: str = Field(min_length=8, max_length=64)
    activity_id: str
    selected_answer: str = Field(max_length=200)
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
    coins: int
    level: int
    earned_activity_ids: list[str]
