import pytest
from fastapi.testclient import TestClient
from app.main import app, seed_initial_data
from app.core.database import engine, Base, SessionLocal

@pytest.fixture(scope="session", autouse=True)
def setup_database():
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

def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["pricing"] == "100% Free - No Paywalls"

def test_auth_and_user_flow(client):
    # Register a new test user
    reg_data = {
        "email": "tester@paaaaaatify.com",
        "username": "music_tester",
        "password": "securepassword123",
        "display_name": "Music Tester"
    }
    res = client.post("/api/v1/auth/register", json=reg_data)
    assert res.status_code in (200, 400)
    
    # Login
    login_data = {
        "email": "tester@paaaaaatify.com",
        "password": "securepassword123"
    }
    res = client.post("/api/v1/auth/login", json=login_data)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "tester@paaaaaatify.com"
    token = data["access_token"]

    # Access current user profile
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["username"] == "music_tester"

def test_music_library(client):
    # Get all songs
    res = client.get("/api/v1/songs")
    assert res.status_code == 200
    songs = res.json()
    assert len(songs) >= 5
    first_song = songs[0]
    assert "title" in first_song
    assert "audio_url" in first_song
    assert "genre" in first_song

    # Search songs
    res = client.get("/api/v1/songs?search=Industry")
    assert res.status_code == 200
    search_results = res.json()
    assert any("Industry Baby" in s["title"] for s in search_results)

    # Get genres
    res = client.get("/api/v1/songs/genres")
    assert res.status_code == 200
    genres = res.json()
    assert len(genres) >= 5

def test_playlist_lifecycle(client):
    import uuid
    uid = uuid.uuid4().hex[:8]
    reg_res = client.post("/api/v1/auth/register", json={
        "email": f"playlist_user_{uid}@example.com",
        "username": f"pl_user_{uid}",
        "password": "playlist_pass_123"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch initial playlists for freshly registered user
    res = client.get("/api/v1/playlists", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 0

    # Create new playlist
    new_pl = {"title": "Cyberpunk Vibes 2077", "description": "Future neon sounds", "is_public": True}
    res = client.post("/api/v1/playlists", json=new_pl, headers=headers)
    assert res.status_code == 201
    created_pl = res.json()
    pl_id = created_pl["id"]

    # Verify playlist count is now 1
    res = client.get("/api/v1/playlists", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Get songs and add first song to playlist
    songs_res = client.get("/api/v1/songs")
    song_id = songs_res.json()[0]["id"]
    res = client.post(f"/api/v1/playlists/{pl_id}/songs", json={"song_id": song_id}, headers=headers)
    assert res.status_code == 200

    # Fetch playlist details
    res = client.get(f"/api/v1/playlists/{pl_id}", headers=headers)
    assert res.status_code == 200
    pl_details = res.json()
    assert pl_details["song_count"] == 1
    assert pl_details["songs"][0]["id"] == song_id

def test_group_listening_room(client):
    import uuid
    uid = uuid.uuid4().hex[:8]
    reg_res = client.post("/api/v1/auth/register", json={
        "email": f"room_host_{uid}@example.com",
        "username": f"room_host_{uid}",
        "password": "room_host_pass_123"
    })
    assert reg_res.status_code == 200
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create room
    res = client.post("/api/v1/rooms", json={"name": "Tobi's Live Session"}, headers=headers)
    assert res.status_code == 201
    room = res.json()
    assert room["code"].startswith("PAAAA-")
    assert room["is_host"] is True
    assert room["playback_state"] == "PAUSED"
    room_id = room["id"]
    room_code = room["code"]

    # Host executes PLAY
    res = client.post(f"/api/v1/rooms/{room_id}/play", json={"action": "PLAY", "position_ms": 12000}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["playback_state"] == "PLAYING"
    assert data["current_position_ms"] == 12000

    # Non-host participant joins
    res_p = client.post("/api/v1/auth/login", json={"email": "tester@paaaaaatify.com", "password": "securepassword123"})
    p_token = res_p.json()["access_token"]
    p_headers = {"Authorization": f"Bearer {p_token}"}

    res_join = client.post("/api/v1/rooms/join", json={"code": room_code}, headers=p_headers)
    assert res_join.status_code == 200
    joined_room = res_join.json()
    assert joined_room["is_host"] is False
    assert joined_room["participants_count"] == 2

    # Non-host attempting to PLAY directly must be rejected with 403
    res_unauth = client.post(f"/api/v1/rooms/{room_id}/play", json={"action": "PLAY"}, headers=p_headers)
    assert res_unauth.status_code == 403

def test_recommendations(client):
    res = client.get("/api/v1/recommendations/trending")
    assert res.status_code == 200
    trending = res.json()
    assert len(trending) > 0

    res = client.get("/api/v1/recommendations/popular-artists")
    assert res.status_code == 200
    artists = res.json()
    assert len(artists) > 0
