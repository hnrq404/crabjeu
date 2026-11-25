import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

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


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    return default if value is None else value.strip().lower() in ("1", "true", "yes", "on")


def seed_demo_data(db: Session) -> None:
    # Em desenvolvimento cria joao/1234 e educador/4321. Em produção (SEED_DEMO_USERS=false)
    # não há aluno de demonstração e o educador só é criado se EDUCATOR_PASSWORD for definido.
    demo = _env_flag("SEED_DEMO_USERS", True)
    educator_password = os.getenv("EDUCATOR_PASSWORD") or ("4321" if demo else None)
    educator_username = os.getenv("EDUCATOR_USERNAME") or DEMO_EDUCATOR_USERNAME

    if demo and not db.get(User, DEMO_STUDENT_ID):
        db.add(User(id=DEMO_STUDENT_ID, username=DEMO_STUDENT_USERNAME, role="student",
                    avatar_key="crab", password_hash=hash_pin("1234")))
    if educator_password and not db.get(User, DEMO_EDUCATOR_ID):
        db.add(User(id=DEMO_EDUCATOR_ID, username=educator_username, role="educator",
                    avatar_key="lion", password_hash=hash_pin(educator_password)))

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


def answered_activities(db: Session, student_id: str) -> list[str]:
    rows = db.scalars(
        select(ActivityAttempt.activity_id).where(ActivityAttempt.student_id == student_id).distinct()
    ).all()
    return sorted(rows)


def active_days(db: Session, student_id: str) -> set[str]:
    moments = db.scalars(select(ActivityAttempt.completed_at).where(ActivityAttempt.student_id == student_id)).all()
    return {game_rules.day_key(m) for m in moments if m}


def user_out(db: Session, user: User) -> UserOut:
    earned = earned_activities(db, user.id)
    coins = game_rules.coins_for([d for _, d in earned])
    days = active_days(db, user.id)
    streak = game_rules.streak_info(days, game_rules.day_key(datetime.now(timezone.utc)))
    return UserOut(
        id=user.id,
        username=user.username,
        role=user.role,
        avatar_key=user.avatar_key,
        coins=coins,
        level=game_rules.level_for(coins),
        earned_activity_ids=sorted(a for a, _ in earned),
        answered_activity_ids=answered_activities(db, user.id),
        active_days=sorted(days)[-400:],
        streak=streak["current"],
        best_streak=streak["best"],
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
            "streak": summary.streak,
            "best_streak": summary.best_streak,
            "last_sync": last_sync,
        })
    return result



# Estatísticas para os gráficos do painel (turma inteira ou um aluno).
STATS_DAYS = 30
MISTAKES_LIMIT = 30


def _attempt_rows(db: Session, student_id: str | None = None):
    query = (
        select(ActivityAttempt, Activity, Module)
        .join(Activity, Activity.id == ActivityAttempt.activity_id)
        .join(Module, Module.id == Activity.module_id)
    )
    if student_id:
        query = query.where(ActivityAttempt.student_id == student_id)
    return db.execute(query).all()


def _breakdown(rows, key, label, order) -> list[dict]:
    groups: dict = {}
    for attempt, activity, module in rows:
        k = key(activity, module)
        g = groups.setdefault(k, {"key": k, "label": label(activity, module), "order": order(activity, module),
                                  "answered": 0, "wrong": 0})
        g["answered"] += 1
        g["wrong"] += 0 if attempt.is_correct else 1
    return sorted(groups.values(), key=lambda g: g["order"])


def _stats(rows, days: int) -> dict:
    today = datetime.now(timezone.utc)
    day_keys = [game_rules.day_key(today - timedelta(days=i)) for i in range(days - 1, -1, -1)]
    daily = {d: {"date": d, "correct": 0, "wrong": 0} for d in day_keys}
    for attempt, _, _ in rows:
        bucket = daily.get(game_rules.day_key(attempt.completed_at))
        if bucket:
            bucket["correct" if attempt.is_correct else "wrong"] += 1

    difficulty_order = {d: i for i, d in enumerate(game_rules.DIFFICULTIES)}
    kind_order = {k: i for i, k in enumerate(ACTIVITY_KINDS)}
    answered = len(rows)
    wrong = sum(0 if a.is_correct else 1 for a, _, _ in rows)
    return {
        "answered": answered,
        "correct": answered - wrong,
        "wrong": wrong,
        "daily": list(daily.values()),
        "by_module": _breakdown(rows, lambda a, m: m.id, lambda a, m: m.title, lambda a, m: m.order_index),
        "by_difficulty": _breakdown(rows, lambda a, m: a.difficulty, lambda a, m: DIFFICULTY_LABELS.get(a.difficulty, a.difficulty),
                                    lambda a, m: difficulty_order.get(a.difficulty, 99)),
        "by_kind": _breakdown(rows, lambda a, m: a.kind, lambda a, m: ACTIVITY_KINDS.get(a.kind, a.kind),
                              lambda a, m: kind_order.get(a.kind, 99)),
    }


DIFFICULTY_LABELS = {"facil": "Fácil", "medio": "Médio", "dificil": "Difícil"}
ACTIVITY_KINDS = {"choice": "Escolher a resposta", "listen": "Ouvir e escolher", "voice": "Falar a frase"}


@app.get("/api/v1/educator/overview")
def educator_overview(days: int = STATS_DAYS, db: Session = Depends(get_db), _: dict = Depends(require_educator)):
    days = max(7, min(days, 90))
    return _stats(_attempt_rows(db), days)


@app.get("/api/v1/educator/students/{student_id}")
def educator_student(student_id: str, days: int = STATS_DAYS, db: Session = Depends(get_db),
                     _: dict = Depends(require_educator)):
    student = db.get(User, student_id)
    if not student or student.role != "student":
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    days = max(7, min(days, 90))
    rows = _attempt_rows(db, student_id)
    mistakes = sorted((r for r in rows if not r[0].is_correct), key=lambda r: r[0].completed_at, reverse=True)
    summary = user_out(db, student)
    return {
        "student_id": student.id,
        "name": student.username,
        "level": summary.level,
        "coins": summary.coins,
        "streak": summary.streak,
        "best_streak": summary.best_streak,
        **_stats(rows, days),
        "mistakes": [
            {
                "activity_id": activity.id,
                "module": module.title,
                "difficulty": DIFFICULTY_LABELS.get(activity.difficulty, activity.difficulty),
                "kind": ACTIVITY_KINDS.get(activity.kind, activity.kind),
                "question": activity.question_text,
                "prompt": activity.prompt,
                "answer": attempt.selected_answer,
                "correct_answer": activity.correct_answer,
                "completed_at": attempt.completed_at,
            }
            for attempt, activity, module in mistakes[:MISTAKES_LIMIT]
        ],
    }

# --------------------------------------------------------------------------- PWA
# Em hospedagens de serviço único (ex.: Render), a própria API entrega o PWA.
# STATIC_DIR aponta para o build web (expo export + sw.js). Sem ele, nada muda.

STATIC_DIR = os.getenv("STATIC_DIR")

if STATIC_DIR and os.path.isdir(STATIC_DIR):
    from pathlib import Path

    from fastapi.responses import FileResponse

    _static_root = Path(STATIC_DIR).resolve()
    _NO_CACHE = {"Cache-Control": "no-cache"}

    @app.get("/{path:path}", include_in_schema=False)
    def pwa(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        file = (_static_root / path).resolve()
        if path and file.is_file() and file.is_relative_to(_static_root):
            if path.startswith("_expo/"):
                headers = {"Cache-Control": "public, max-age=31536000, immutable"}
            else:
                headers = _NO_CACHE
            media = "application/manifest+json" if file.suffix == ".webmanifest" else None
            return FileResponse(file, headers=headers, media_type=media)
        # Rotas do app (SPA) caem no index.html.
        return FileResponse(_static_root / "index.html", headers=_NO_CACHE)
