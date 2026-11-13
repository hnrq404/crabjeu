import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import game_rules
from .database import Base, SessionLocal, engine, get_db
from .models import Activity, ActivityAttempt, Module, StudentProgress, User
from .schemas import (
    ChangePasswordIn,
    LoginIn,
    LoginOut,
    RegisterIn,
    SyncAttemptsIn,
    SyncAttemptsOut,
    UpdateMeIn,
    UserOut,
)
from .security import create_access_token, decode_access_token, hash_pin, verify_pin
from .seed_content import iter_content

DEMO_STUDENT_ID = "11111111-1111-1111-1111-111111111111"
DEMO_EDUCATOR_ID = "22222222-2222-2222-2222-222222222222"
DEMO_STUDENT_USERNAME = "joao"
DEMO_EDUCATOR_USERNAME = "educador"


def seed_demo_data(db: Session) -> None:
    if not db.get(User, DEMO_STUDENT_ID):
        db.add(User(id=DEMO_STUDENT_ID, username=DEMO_STUDENT_USERNAME, role="student",
                    avatar_key="crab", password_hash=hash_pin("1234")))
    if not db.get(User, DEMO_EDUCATOR_ID):
        db.add(User(id=DEMO_EDUCATOR_ID, username=DEMO_EDUCATOR_USERNAME, role="educator",
                    avatar_key="lion", password_hash=hash_pin("4321")))

    # Cria ou atualiza o conteúdo quando a versão do seed for maior.
    for mod, acts in iter_content():
        existing = db.get(Module, mod["id"])
        if not existing:
            db.add(Module(**mod))
        elif existing.version < mod["version"]:
            for key, value in mod.items():
                setattr(existing, key, value)
        db.flush()
        for act in acts:
            data = {**act, "options_json": json.dumps(act["options"], ensure_ascii=False)}
            data.pop("options")
            current = db.get(Activity, act["id"])
            if not current:
                db.add(Activity(**data))
            elif current.version < act["version"]:
                for key, value in data.items():
                    setattr(current, key, value)
    db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)
    yield


app = FastAPI(title="Crabjeu API", version="0.4.0", lifespan=lifespan)


# --------------------------------------------------------------------------- auth

def require_token(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        return decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")


def current_user(payload: dict = Depends(require_token), db: Session = Depends(get_db)) -> User:
    user = db.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user


def require_educator(payload: dict = Depends(require_token)) -> dict:
    if payload.get("role") != "educator":
        raise HTTPException(status_code=403, detail="Acesso restrito a educadores")
    return payload


def normalize_username(username: str) -> str:
    return username.strip().lower()


def earned_activities(db: Session, student_id: str) -> list[tuple[str, str]]:
    """(activity_id, difficulty) de cada pergunta que o aluno já acertou alguma vez."""
    rows = db.execute(
        select(Activity.id, Activity.difficulty)
        .join(ActivityAttempt, ActivityAttempt.activity_id == Activity.id)
        .where(ActivityAttempt.student_id == student_id, ActivityAttempt.is_correct.is_(True))
        .distinct()
    ).all()
    return [(r[0], r[1]) for r in rows]


def user_out(db: Session, user: User) -> UserOut:
    earned = earned_activities(db, user.id)
    coins = game_rules.coins_for([d for _, d in earned])
    return UserOut(
        id=user.id,
        username=user.username,
        role=user.role,
        avatar_key=user.avatar_key,
        coins=coins,
        level=game_rules.level_for(coins),
        earned_activity_ids=sorted(a for a, _ in earned),
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/auth/register", response_model=LoginOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    username = normalize_username(data.username)
    if db.scalar(select(User).where(User.username == username)):
        raise HTTPException(status_code=409, detail="Esse nome de usuário já existe")
    user = User(username=username, role="student", avatar_key=data.avatar_key or "crab",
                password_hash=hash_pin(data.password))
    db.add(user)
    db.commit()
    return LoginOut(token=create_access_token(user.id, user.role), user=user_out(db, user))


@app.post("/api/v1/auth/login", response_model=LoginOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == normalize_username(data.username)))
    if not user or not verify_pin(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha inválidos")
    return LoginOut(token=create_access_token(user.id, user.role), user=user_out(db, user))


# ----------------------------------------------------------------------- perfil

@app.get("/api/v1/me", response_model=UserOut)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return user_out(db, user)


@app.patch("/api/v1/me", response_model=UserOut)
def update_me(data: UpdateMeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if data.username is not None:
        username = normalize_username(data.username)
        taken = db.scalar(select(User).where(User.username == username, User.id != user.id))
        if taken:
            raise HTTPException(status_code=409, detail="Esse nome de usuário já existe")
        user.username = username
    if data.avatar_key is not None:
        user.avatar_key = data.avatar_key
    db.commit()
    return user_out(db, user)


@app.post("/api/v1/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: ChangePasswordIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_pin(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    user.password_hash = hash_pin(data.new_password)
    db.commit()


# --------------------------------------------------------------------- conteúdo

@app.get("/api/v1/content/sync")
def content_sync(since_version: int = 0, db: Session = Depends(get_db), _: dict = Depends(require_token)):
    modules = db.scalars(select(Module).where(Module.version > since_version).order_by(Module.order_index)).all()
    activities = db.scalars(
        select(Activity).where(Activity.version > since_version)
        .order_by(Activity.module_id, Activity.difficulty, Activity.order_index)
    ).all()
    latest = db.scalar(select(func.max(Activity.version))) or 0
    return {
        "content_version": max(since_version, latest),
        "modules": [
            {"id": m.id, "title": m.title, "description": m.description,
             "order_index": m.order_index, "version": m.version}
            for m in modules
        ],
        "activities": [
            {
                "id": a.id,
                "module_id": a.module_id,
                "kind": a.kind,
                "difficulty": a.difficulty,
                "order_index": a.order_index,
                "question_text": a.question_text,
                "prompt": a.prompt,
                "options": json.loads(a.options_json),
                "correct_answer": a.correct_answer,
                "version": a.version,
            }
            for a in activities
        ],
    }


# ---------------------------------------------------------------- sincronização

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

        # O servidor recalcula o acerto: não confia no score enviado pelo aparelho.
        correct = game_rules.is_correct(activity.kind, item.selected_answer, activity.correct_answer)
        score = 100.0 if correct else 0.0
        db.add(ActivityAttempt(
            id=item.attempt_id,
            student_id=data.student_id,
            activity_id=item.activity_id,
            selected_answer=item.selected_answer,
            is_correct=correct,
            score=score,
            completed_at=item.completed_at,
        ))

        progress = db.scalar(
            select(StudentProgress).where(
                StudentProgress.student_id == data.student_id,
                StudentProgress.activity_id == item.activity_id,
            )
        )
        if not progress:
            db.add(StudentProgress(
                student_id=data.student_id,
                activity_id=item.activity_id,
                is_completed=True,
                best_score=score,
                attempts_count=1,
                last_attempt_at=item.completed_at,
            ))
        else:
            progress.is_completed = True
            progress.best_score = max(progress.best_score, score)
            progress.attempts_count += 1
            progress.last_attempt_at = item.completed_at
            progress.updated_at = datetime.now(timezone.utc)
        db.flush()
        synced += 1

    db.commit()
    summary = user_out(db, db.get(User, data.student_id))
    return SyncAttemptsOut(
        status="success",
        synced_records=synced,
        duplicated_records=duplicated,
        server_timestamp=datetime.now(timezone.utc),
        coins=summary.coins,
        level=summary.level,
        earned_activity_ids=summary.earned_activity_ids,
    )


# ---------------------------------------------------------------------- educador

@app.get("/api/v1/educator/students")
def educator_students(db: Session = Depends(get_db), _: dict = Depends(require_educator)):
    students = db.scalars(select(User).where(User.role == "student").order_by(User.username)).all()
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
        summary = user_out(db, student)
        result.append({
            "student_id": student.id,
            "name": student.username,
            "completed_activities_count": completed,
            "correct_activities_count": len(summary.earned_activity_ids),
            "coins": summary.coins,
            "level": summary.level,
            "last_sync": last_sync,
        })
    return result
