import json
import os
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Activity, ActivityAttempt, Module, StudentProgress, User
from .schemas import LoginIn, LoginOut, ProfileOut, SyncAttemptsIn, SyncAttemptsOut
from .security import create_access_token, decode_access_token, hash_pin, verify_pin

app = FastAPI(title="Crabjeu API", version="0.3.0")

DEMO_STUDENT_ID = "11111111-1111-1111-1111-111111111111"
DEMO_EDUCATOR_ID = "22222222-2222-2222-2222-222222222222"
DEMO_MODULE_ID = "33333333-3333-3333-3333-333333333333"
DEMO_ACTIVITY_ID = "44444444-4444-4444-4444-444444444444"


def seed_demo_data(db: Session) -> None:
    if not db.get(User, DEMO_STUDENT_ID):
        db.add(
            User(
                id=DEMO_STUDENT_ID,
                name="João Pedro",
                role="student",
                avatar_key="crab-orange",
                pin_hash=hash_pin("1234"),
            )
        )
    if not db.get(User, DEMO_EDUCATOR_ID):
        db.add(
            User(
                id=DEMO_EDUCATOR_ID,
                name="Educador Crabjeu",
                role="educator",
                avatar_key="educator-blue",
                pin_hash=hash_pin("4321"),
            )
        )
    if not db.get(Module, DEMO_MODULE_ID):
        db.add(
            Module(
                id=DEMO_MODULE_ID,
                title="Saudações",
                description="Primeiro contato com cumprimentos em francês.",
                order_index=1,
                version=1,
            )
        )
    if not db.get(Activity, DEMO_ACTIVITY_ID):
        db.add(
            Activity(
                id=DEMO_ACTIVITY_ID,
                module_id=DEMO_MODULE_ID,
                question_text='Como se diz "Bom dia" em francês?',
                options_json=json.dumps(["Bonsoir", "Bonjour", "Merci", "Salut"]),
                correct_answer="Bonjour",
                version=1,
            )
        )
    db.commit()


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with next(get_db()) as db:
        seed_demo_data(db)


def require_token(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


def require_educator(payload: dict = Depends(require_token)) -> dict:
    if payload.get("role") != "educator":
        raise HTTPException(status_code=403, detail="Acesso restrito a educadores")
    return payload


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/profiles", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    users = db.scalars(select(User).where(User.role == "student").order_by(User.name)).all()
    return [ProfileOut(id=u.id, name=u.name, avatar_key=u.avatar_key) for u in users]


@app.post("/api/v1/auth/login", response_model=LoginOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.get(User, data.profile_id)
    if not user or not verify_pin(data.pin, user.pin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Perfil ou PIN inválido")
    return LoginOut(
        token=create_access_token(user.id, user.role),
        user={"id": user.id, "name": user.name, "role": user.role, "avatar_key": user.avatar_key},
    )


@app.get("/api/v1/content/sync")
def content_sync(since_version: int = 0, db: Session = Depends(get_db), _: dict = Depends(require_token)):
    modules = db.scalars(select(Module).where(Module.version > since_version).order_by(Module.order_index)).all()
    activities = db.scalars(select(Activity).where(Activity.version > since_version)).all()
    return {
        "content_version": max([0, *[m.version for m in modules], *[a.version for a in activities]]),
        "modules": [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "order_index": m.order_index,
                "version": m.version,
            }
            for m in modules
        ],
        "activities": [
            {
                "id": a.id,
                "module_id": a.module_id,
                "question_text": a.question_text,
                "options": json.loads(a.options_json),
                "correct_answer": a.correct_answer,
                "version": a.version,
            }
            for a in activities
        ],
    }


@app.post("/api/v1/sync/attempts", response_model=SyncAttemptsOut)
def sync_attempts(data: SyncAttemptsIn, db: Session = Depends(get_db), payload: dict = Depends(require_token)):
    if payload.get("sub") != data.student_id or payload.get("role") != "student":
        raise HTTPException(status_code=403, detail="Usuário não autorizado para este aluno")

    synced = 0
    duplicated = 0
    for item in data.offline_attempts:
        if db.get(ActivityAttempt, item.attempt_id):
            duplicated += 1
            continue

        activity = db.get(Activity, item.activity_id)
        if not activity:
            raise HTTPException(status_code=400, detail=f"Atividade inexistente: {item.activity_id}")

        expected_score = 100.0 if item.selected_answer == activity.correct_answer else 0.0
        attempt = ActivityAttempt(
            id=item.attempt_id,
            student_id=data.student_id,
            activity_id=item.activity_id,
            selected_answer=item.selected_answer,
            is_correct=expected_score == 100.0,
            score=expected_score,
            completed_at=item.completed_at,
        )
        db.add(attempt)

        progress = db.scalar(
            select(StudentProgress).where(
                StudentProgress.student_id == data.student_id,
                StudentProgress.activity_id == item.activity_id,
            )
        )
        if not progress:
            progress = StudentProgress(
                student_id=data.student_id,
                activity_id=item.activity_id,
                is_completed=True,
                best_score=expected_score,
                attempts_count=1,
                last_attempt_at=item.completed_at,
            )
            db.add(progress)
        else:
            progress.is_completed = True
            progress.best_score = max(progress.best_score, expected_score)
            progress.attempts_count += 1
            progress.last_attempt_at = item.completed_at
            progress.updated_at = datetime.now(timezone.utc)
        synced += 1

    db.commit()
    return SyncAttemptsOut(
        status="success",
        synced_records=synced,
        duplicated_records=duplicated,
        server_timestamp=datetime.now(timezone.utc),
    )


@app.get("/api/v1/educator/students")
def educator_students(db: Session = Depends(get_db), _: dict = Depends(require_educator)):
    students = db.scalars(select(User).where(User.role == "student").order_by(User.name)).all()
    result = []
    for student in students:
        completed = db.scalar(
            select(func.count(StudentProgress.id)).where(
                StudentProgress.student_id == student.id,
                StudentProgress.is_completed.is_(True),
            )
        ) or 0
        last_sync = db.scalar(
            select(func.max(ActivityAttempt.received_at)).where(ActivityAttempt.student_id == student.id)
        )
        result.append(
            {
                "student_id": student.id,
                "name": student.name,
                "completed_activities_count": completed,
                "last_sync": last_sync,
            }
        )
    return result
