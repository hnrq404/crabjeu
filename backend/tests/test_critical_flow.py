import os
import tempfile
from pathlib import Path

DB_PATH = Path(tempfile.gettempdir()) / "crabjeu_test.db"
if DB_PATH.exists():
    DB_PATH.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
os.environ["JWT_SECRET"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app, DEMO_ACTIVITY_ID, DEMO_EDUCATOR_ID, DEMO_STUDENT_ID  # noqa: E402


def test_end_to_end_sync_and_recovery():
    with TestClient(app) as client:
        # Perfil do aluno vem do banco, não da tela hardcoded.
        profiles = client.get("/api/v1/profiles")
        assert profiles.status_code == 200
        assert any(p["id"] == DEMO_STUDENT_ID for p in profiles.json())

        # Login do aluno.
        login = client.post(
            "/api/v1/auth/login",
            json={"profile_id": DEMO_STUDENT_ID, "pin": "1234"},
        )
        assert login.status_code == 200
        student_token = login.json()["token"]

        # Conteúdo real recuperado do banco.
        content = client.get(
            "/api/v1/content/sync?since_version=0",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert content.status_code == 200
        assert content.json()["activities"][0]["id"] == DEMO_ACTIVITY_ID

        attempt = {
            "attempt_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "activity_id": DEMO_ACTIVITY_ID,
            "selected_answer": "Bonjour",
            "score": 100,
            "completed_at": "2026-10-16T18:30:00Z",
        }

        # Sincronização do registro produzido offline.
        sync = client.post(
            "/api/v1/sync/attempts",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"student_id": DEMO_STUDENT_ID, "offline_attempts": [attempt]},
        )
        assert sync.status_code == 200
        assert sync.json()["synced_records"] == 1
        assert sync.json()["duplicated_records"] == 0

        # Reenvio do mesmo attempt_id prova idempotência / deduplicação.
        duplicate = client.post(
            "/api/v1/sync/attempts",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"student_id": DEMO_STUDENT_ID, "offline_attempts": [attempt]},
        )
        assert duplicate.status_code == 200
        assert duplicate.json()["synced_records"] == 0
        assert duplicate.json()["duplicated_records"] == 1

        # Login do educador e recuperação do progresso persistido.
        educator_login = client.post(
            "/api/v1/auth/login",
            json={"profile_id": DEMO_EDUCATOR_ID, "pin": "4321"},
        )
        assert educator_login.status_code == 200
        educator_token = educator_login.json()["token"]

        dashboard = client.get(
            "/api/v1/educator/students",
            headers={"Authorization": f"Bearer {educator_token}"},
        )
        assert dashboard.status_code == 200
        student = next(x for x in dashboard.json() if x["student_id"] == DEMO_STUDENT_ID)
        assert student["completed_activities_count"] == 1
        assert student["last_sync"] is not None
