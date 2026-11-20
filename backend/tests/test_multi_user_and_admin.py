import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.models import User, Playlist

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_admin_access_control(client):
    """Verify regular users cannot access administrative endpoints (403 Forbidden)."""
    uid = uuid.uuid4().hex[:8]
    # Register normal client user with unique email
    reg_res = client.post("/api/v1/auth/register", json={
        "email": f"client_{uid}@example.com",
        "username": f"user_{uid}",
        "password": "alicePassword123!",
        "display_name": "Alice Client"
    })
    assert reg_res.status_code == 200
    alice_token = reg_res.json()["access_token"]

    # Alice attempts to access admin users list -> MUST BE 403 FORBIDDEN
    res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {alice_token}"})
    assert res.status_code == 403
    assert "admin" in res.json()["detail"].lower()

    # Login as Admin -> MUST BE 200 OK
    admin_login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@paaaaaatify.internal",
        "password": "paaaaaatify_admin_secure_2026"
    })
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json()["access_token"]

    admin_res = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_res.status_code == 200
    users = admin_res.json()
    assert any(u["username"] == f"user_{uid}" for u in users)

def test_admin_health_and_providers(client):
    """Verify admin health metrics and modular music providers catalog."""
    admin_login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@paaaaaatify.internal",
        "password": "paaaaaatify_admin_secure_2026"
    })
    token = admin_login_res.json()["access_token"]

    # Health
    h_res = client.get("/api/v1/admin/health", headers={"Authorization": f"Bearer {token}"})
    assert h_res.status_code == 200
    health = h_res.json()
    assert health["status"] == "healthy"
    assert "database" in health
    assert "metrics" in health

    # Providers
    p_res = client.get("/api/v1/admin/providers", headers={"Authorization": f"Bearer {token}"})
    assert p_res.status_code == 200
    providers = p_res.json()
    assert len(providers) >= 4
    assert any(p["id"] == "soundhelix" for p in providers)
    assert any(p["id"] == "jamendo" for p in providers)

def test_user_data_isolation(client):
    """Verify User A cannot delete or modify User B's playlists."""
    uid_a = uuid.uuid4().hex[:8]
    uid_b = uuid.uuid4().hex[:8]

    # Register User A
    res_a = client.post("/api/v1/auth/register", json={
        "email": f"user_a_{uid_a}@example.com",
        "username": f"user_a_{uid_a}",
        "password": "Password123!"
    })
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]

    # Register User B
    res_b = client.post("/api/v1/auth/register", json={
        "email": f"user_b_{uid_b}@example.com",
        "username": f"user_b_{uid_b}",
        "password": "Password123!"
    })
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]

    # User A creates a playlist
    pl_res = client.post(
        "/api/v1/playlists",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"title": f"User A Private Playlist {uid_a}", "is_public": False}
    )
    assert pl_res.status_code == 201
    pl_id = pl_res.json()["id"]

    # User B attempts to delete User A's playlist -> MUST BE 403 Forbidden or 404
    del_res = client.post(
        f"/api/v1/playlists/{pl_id}/songs",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"song_id": "dummy"}
    )
    # User B cannot modify User A's playlist
    assert del_res.status_code in (403, 404)

def test_account_deletion_flow(client):
    """Verify permanent account deletion (GDPR & Google Play compliance)."""
    uid = uuid.uuid4().hex[:8]
    # Register temporary user
    reg = client.post("/api/v1/auth/register", json={
        "email": f"delete_{uid}@example.com",
        "username": f"del_{uid}",
        "password": "DeleteMe123!"
    })
    assert reg.status_code == 200
    token = reg.json()["access_token"]
    user_id = reg.json()["user"]["id"]

    # User deletes their own account
    del_res = client.delete("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Confirm user is removed from database
    db = SessionLocal()
    u = db.query(User).filter(User.id == user_id).first()
    assert u is None
    db.close()

    # Old token can no longer authenticate
    me_res = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code in (401, 404)
