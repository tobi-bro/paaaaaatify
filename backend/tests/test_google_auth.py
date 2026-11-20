import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app, seed_initial_data
from app.core.database import engine, Base, SessionLocal
from app.models.models import User

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_google_auth_valid_new_user(client):
    """Test valid Google ID token for a brand-new user creates account and returns tokens."""
    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": "google-uid-new-123456",
        "email": "cyber_listener_new@example.com",
        "name": "Cyber Listener",
        "picture": "https://example.com/avatar.jpg"
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"credential": "mock_valid_google_token"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "cyber_listener_new@example.com"
        assert data["user"]["display_name"] == "Cyber Listener"

def test_google_auth_existing_user_linking(client):
    """Test Google sign-in for an existing user email links the google_id without duplicating account."""
    # First register normal user
    reg_data = {
        "email": "linkme@paaaaaatify.com",
        "username": "link_target_user",
        "password": "strongPassword123!",
        "display_name": "Link Target"
    }
    client.post("/api/v1/auth/register", json=reg_data)

    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": "google-uid-linked-999",
        "email": "linkme@paaaaaatify.com",
        "name": "Link Target",
        "picture": "https://example.com/avatar2.jpg"
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"credential": "mock_link_token"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["email"] == "linkme@paaaaaatify.com"
        assert data["user"]["username"] == "link_target_user"

    # Verify directly in DB
    db = SessionLocal()
    user = db.query(User).filter(User.email == "linkme@paaaaaatify.com").first()
    assert user is not None
    assert user.google_id == "google-uid-linked-999"
    db.close()

def test_google_auth_existing_google_id_login(client):
    """Test Google sign-in for an already registered Google user."""
    mock_payload = {
        "iss": "accounts.google.com",
        "sub": "google-uid-new-123456",
        "email": "cyber_listener_new@example.com",
        "name": "Cyber Listener",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"credential": "mock_token_existing"})
        assert res.status_code == 200
        data = res.json()
        assert data["user"]["email"] == "cyber_listener_new@example.com"
        assert "access_token" in data

def test_google_auth_invalid_token_rejection(client):
    """Test rejection of invalid Google tokens."""
    with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Invalid token")):
        res = client.post("/api/v1/auth/google", json={"credential": "bad_token"})
        assert res.status_code == 401
        assert "Invalid Google ID token" in res.json()["detail"]

def test_google_auth_expired_token_rejection(client):
    """Test rejection of expired Google tokens."""
    with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token expired")):
        res = client.post("/api/v1/auth/google", json={"credential": "expired_token"})
        assert res.status_code == 401
        assert "expired" in res.json()["detail"].lower()

def test_google_auth_audience_mismatch_rejection(client):
    """Test rejection when token audience does not match."""
    with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Token has wrong audience")):
        res = client.post("/api/v1/auth/google", json={"credential": "wrong_aud_token"})
        assert res.status_code == 401
        assert "audience" in res.json()["detail"].lower()

def test_google_auth_invalid_issuer_rejection(client):
    """Test rejection when issuer is not Google."""
    mock_payload = {
        "iss": "https://malicious-issuer.com",
        "sub": "evil-sub",
        "email": "attacker@evil.com"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"credential": "fake_issuer_token"})
        assert res.status_code == 401
        assert "issuer" in res.json()["detail"].lower()

def test_google_auth_missing_email_rejection(client):
    """Test rejection when Google token lacks email claim."""
    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": "some-sub-no-email"
    }
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        res = client.post("/api/v1/auth/google", json={"credential": "no_email_token"})
        assert res.status_code == 400
        assert "email" in res.json()["detail"].lower()

def test_google_auth_network_outage(client):
    """Test proper 503 response if Google cert servers are unreachable."""
    with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=Exception("Failed to establish network connection")):
        res = client.post("/api/v1/auth/google", json={"credential": "token_during_outage"})
        assert res.status_code == 503
        assert "Google authentication servers" in res.json()["detail"]

def test_refresh_token_and_logout_flow(client):
    """Test token refresh, rotation, and revocation flow."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    reg_res = client.post("/api/v1/auth/register", json={
        "email": f"refresh_user_{uid}@example.com",
        "username": f"ref_user_{uid}",
        "password": "refresh_pass_123"
    })
    assert reg_res.status_code == 200
    tokens = reg_res.json()
    old_refresh_token = tokens["refresh_token"]
    access_token = tokens["access_token"]

    # First Refresh: should succeed and return new tokens
    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh_token})
    assert ref_res.status_code == 200
    new_tokens = ref_res.json()
    new_refresh_token = new_tokens["refresh_token"]
    assert "access_token" in new_tokens
    assert new_refresh_token != old_refresh_token

    # Re-using the old refresh token MUST fail (Refresh Token Rotation & Revocation)
    replay_res = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh_token})
    assert replay_res.status_code == 401
    assert "revoked" in replay_res.json()["detail"].lower()

    # Logout with active refresh token
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"refresh_token": new_refresh_token}
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["message"] == "Logged out successfully"

    # Using the logged-out refresh token MUST fail
    after_logout_res = client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh_token})
    assert after_logout_res.status_code == 401
    assert "revoked" in after_logout_res.json()["detail"].lower()

def test_cors_explicit_origin_allowlist(client):
    """Verify CORS headers for allowed origins."""
    # Allowed origin
    res = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST"
        }
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"

