import json
import os
import tempfile
from pathlib import Path

DB_PATH = Path(tempfile.gettempdir()) / "crabjeu_test.db"
if DB_PATH.exists():
    DB_PATH.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
os.environ["JWT_SECRET"] = "test-secret-com-pelo-menos-32-bytes!!"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import game_rules  # noqa: E402
from app.main import DEMO_STUDENT_ID, app  # noqa: E402
from app.seed_content import LEGACY_ACTIVITY_ID  # noqa: E402

CASES = json.loads((Path(__file__).parent / "answer_cases.json").read_text(encoding="utf-8"))


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def attempt(attempt_id: str, activity_id: str, answer: str) -> dict:
    return {
        "attempt_id": attempt_id,
        "activity_id": activity_id,
        "selected_answer": answer,
        "score": 100,  # ignorado: o servidor recalcula
        "completed_at": "2026-10-16T18:30:00Z",
    }


@pytest.mark.parametrize("case", CASES, ids=lambda c: f"{c['kind']}:{c['answer']!r}")
def test_answer_rules_match_shared_cases(case):
    # Os mesmos casos são verificados no cliente (mobile/scripts/check-game-rules.js).
    assert game_rules.is_correct(case["kind"], case["answer"], case["expected"]) is case["correct"]


def test_end_to_end_game_flow():
    with TestClient(app) as client:
        # Login do aluno de demonstração com usuário e senha.
        assert client.post("/api/v1/auth/login", json={"username": "joao", "password": "errada"}).status_code == 401
        login = client.post("/api/v1/auth/login", json={"username": "Joao", "password": "1234"})
        assert login.status_code == 200
        student_token = login.json()["token"]
        assert login.json()["user"]["coins"] == 0

        # Conteúdo: fases com perguntas de múltipla escolha e de voz em cada dificuldade.
        content = client.get("/api/v1/content/sync?since_version=0", headers=auth(student_token)).json()
        activities = {a["id"]: a for a in content["activities"]}
        assert len(content["modules"]) >= 2
        assert LEGACY_ACTIVITY_ID in activities
        for difficulty in game_rules.DIFFICULTIES:
            kinds = {a["kind"] for a in activities.values() if a["difficulty"] == difficulty}
            assert kinds == {"choice", "voice"}

        # Nada novo para quem já tem a versão atual.
        again = client.get(
            f"/api/v1/content/sync?since_version={content['content_version']}", headers=auth(student_token)
        ).json()
        assert again["activities"] == []

        voice_q = next(a for a in activities.values() if a["kind"] == "voice" and a["difficulty"] == "medio")
        wrong_choice = next(o for o in activities[LEGACY_ACTIVITY_ID]["options"] if o != "Bonjour")

        batch = [
            attempt("attempt-0001-certa", LEGACY_ACTIVITY_ID, "Bonjour"),        # fácil, acerto: +1
            attempt("attempt-0002-repetida", LEGACY_ACTIVITY_ID, "Bonjour"),     # mesmo acerto: +0
            attempt("attempt-0003-errada", LEGACY_ACTIVITY_ID, wrong_choice),    # erro: +0
            attempt("attempt-0004-voz", voice_q["id"], voice_q["correct_answer"].lower()),  # médio: +2
        ]
        sync = client.post(
            "/api/v1/sync/attempts",
            headers=auth(student_token),
            json={"student_id": DEMO_STUDENT_ID, "offline_attempts": batch},
        )
        assert sync.status_code == 200
        body = sync.json()
        assert body["synced_records"] == 4
        assert body["duplicated_records"] == 0
        assert body["coins"] == 3
        assert set(body["earned_activity_ids"]) == {LEGACY_ACTIVITY_ID, voice_q["id"]}

        # Reenvio do mesmo attempt_id prova idempotência / deduplicação.
        duplicate = client.post(
            "/api/v1/sync/attempts",
            headers=auth(student_token),
            json={"student_id": DEMO_STUDENT_ID, "offline_attempts": batch[:1]},
        ).json()
        assert duplicate["synced_records"] == 0
        assert duplicate["duplicated_records"] == 1
        assert duplicate["coins"] == 3

        # Educador recupera o progresso persistido.
        educator_token = client.post(
            "/api/v1/auth/login", json={"username": "educador", "password": "4321"}
        ).json()["token"]
        dashboard = client.get("/api/v1/educator/students", headers=auth(educator_token))
        assert dashboard.status_code == 200
        student = next(x for x in dashboard.json() if x["student_id"] == DEMO_STUDENT_ID)
        assert student["completed_activities_count"] == 2
        assert student["correct_activities_count"] == 2
        assert student["coins"] == 3
        assert student["last_sync"] is not None

        # Aluno não acessa o painel do educador.
        assert client.get("/api/v1/educator/students", headers=auth(student_token)).status_code == 403


def test_register_and_settings():
    with TestClient(app) as client:
        reg = client.post("/api/v1/auth/register", json={"username": "Maria_01", "password": "abcd", "avatar_key": "lion"})
        assert reg.status_code == 201
        token = reg.json()["token"]
        assert reg.json()["user"]["username"] == "maria_01"

        # Nome de usuário único (sem diferenciar maiúsculas).
        assert client.post("/api/v1/auth/register", json={"username": "MARIA_01", "password": "abcd"}).status_code == 409
        # Validação de formato.
        assert client.post("/api/v1/auth/register", json={"username": "a b", "password": "abcd"}).status_code == 422

        # Aba Avatar + aba Nome.
        upd = client.patch("/api/v1/me", headers=auth(token), json={"avatar_key": "shark", "username": "maria_nova"})
        assert upd.status_code == 200
        assert upd.json()["avatar_key"] == "shark"
        assert upd.json()["username"] == "maria_nova"
        assert client.patch("/api/v1/me", headers=auth(token), json={"username": "joao"}).status_code == 409

        # Aba Senha.
        bad = client.post("/api/v1/me/password", headers=auth(token),
                          json={"current_password": "xxxx", "new_password": "nova1"})
        assert bad.status_code == 400
        ok = client.post("/api/v1/me/password", headers=auth(token),
                         json={"current_password": "abcd", "new_password": "nova1"})
        assert ok.status_code == 204
        assert client.post("/api/v1/auth/login", json={"username": "maria_nova", "password": "nova1"}).status_code == 200

        # Um aluno não sincroniza tentativas em nome de outro.
        forged = client.post(
            "/api/v1/sync/attempts", headers=auth(token),
            json={"student_id": DEMO_STUDENT_ID, "offline_attempts": []},
        )
        assert forged.status_code == 403
