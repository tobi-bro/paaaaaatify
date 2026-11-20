import os
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, get_db
from app.core.security import decode_token
from app.models.models import (
    User, UserSettings, Genre, Artist, Album, Song, Playlist, PlaylistSong, Favorite
)
from app.api import auth, songs, playlists, favorites, rooms, users, recommendations, uploads, admin
from app.services.sync_engine import sync_engine

def seed_initial_data(db: Session):
    # Platform Admin & Security Credential Rotation
    import secrets
    from app.core.security import hash_password
    admin_email = os.getenv("ADMIN_EMAIL", "admin@paaaaaatify.internal")
    admin_pwd = os.getenv("ADMIN_PASSWORD", "paaaaaatify_admin_secure_2026")

    # Rotate any legacy demo credentials
    legacy_demo = db.query(User).filter(User.email == "tobi@paaaaaatify.com").first()
    if legacy_demo:
        legacy_demo.hashed_password = hash_password(secrets.token_urlsafe(32))
        legacy_demo.is_admin = False
        db.commit()

    admin_user = db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        admin_user = User(
            email=admin_email,
            username="admin",
            display_name="Paaaaaaatify Admin",
            hashed_password=hash_password(admin_pwd),
            avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
            bio="Platform Administrator 🎵",
            is_verified=True,
            is_active=True,
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        user_settings = UserSettings(user_id=admin_user.id)
        db.add(user_settings)
        db.commit()

    # Only seed songs and artists if database is empty
    if db.query(Song).count() > 0:
        return

    # 1. Genres
    genres_data = [
        ("All", "🔥", "from-purple-600 to-indigo-900"),
        ("Hip-Hop", "🎤", "from-emerald-500 to-teal-900"),
        ("Synthwave", "🌆", "from-fuchsia-600 to-pink-900"),
        ("Pop", "✨", "from-pink-500 to-rose-900"),
        ("Lo-Fi", "☕", "from-amber-500 to-orange-900"),
        ("Electronic", "⚡", "from-cyan-500 to-blue-900"),
        ("R&B", "🎷", "from-violet-600 to-purple-900"),
        ("Rock", "🎸", "from-red-600 to-amber-900")
    ]
    genres_map = {}
    for name, icon, grad in genres_data:
        g = Genre(name=name, icon=icon, gradient=grad)
        db.add(g)
        genres_map[name] = g
    db.commit()

    # 2. Artists (matching design reference)
    artists_data = [
        ("Lil Nas X", "Grammy Award-winning trailblazer defining futuristic hip-hop.", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80", 28400000),
        ("ROSÉ", "Global pop icon blending catchy melodies with emotional vocals.", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80", 34200000),
        ("The Weeknd", "Pioneering dark R&B, synth-pop, and futuristic sonic landscapes.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80", 98500000),
        ("Teddy", "Sensational soul and alternative artist with raw vocal energy.", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80", 18200000),
        ("Bazzi", "Multi-platinum singer-songwriter crafting infectious pop harmonies.", "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80", 22100000),
        ("Billie Eilish", "Alternative pop prodigy celebrated worldwide.", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80", 87000000),
        ("Post Malone", "Genre-blending singer known for acoustic melodies and melodic rap.", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80", 79000000),
        ("Chappell Roan", "Explosive glam-pop singer-songwriter with bold theatrical flair.", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80", 41000000),
        ("Cyber Beats", "Futuristic chillhop and cyberpunk electronic producer.", "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80", 8500000)
    ]
    artist_map = {}
    for name, bio, img, listeners in artists_data:
        art = Artist(name=name, bio=bio, image_url=img, monthly_listeners=listeners)
        db.add(art)
        artist_map[name] = art
    db.commit()

    # 3. Albums
    album1 = Album(title="Montero Future", artist_id=artist_map["Lil Nas X"].id, cover_art_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80", release_date="2024", genre="Hip-Hop")
    album2 = Album(title="Rosie Universe", artist_id=artist_map["ROSÉ"].id, cover_art_url="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80", release_date="2024", genre="Pop")
    album3 = Album(title="Dawn Electric", artist_id=artist_map["The Weeknd"].id, cover_art_url="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80", release_date="2024", genre="Synthwave")
    album4 = Album(title="Cosmic Soul", artist_id=artist_map["Teddy"].id, cover_art_url="https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80", release_date="2024", genre="R&B")
    album5 = Album(title="Neon Dreams", artist_id=artist_map["Cyber Beats"].id, cover_art_url="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80", release_date="2024", genre="Electronic")
    db.add_all([album1, album2, album3, album4, album5])
    db.commit()

    # 4. Songs (Exact titles and vibes featured in design screenshot)
    # Audio URLs point to local streaming or high quality web royalty-free audio streams
    songs_data = [
        {
            "title": "Industry Baby",
            "artist": "Lil Nas X",
            "album": album1,
            "duration": 212, # 3:32 matching screenshot
            "genre": "Hip-Hop",
            "trending": True,
            "artwork": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            "lyrics": "Yeah, here we go again\nBaby, I told you I'd never lose\nI told you I'd make it through\nPaaaaaaatify vibes running through the city\nTogether in music, world unite."
        },
        {
            "title": "APT.",
            "artist": "ROSÉ",
            "album": album2,
            "duration": 170, # 2:50
            "genre": "Pop",
            "trending": True,
            "artwork": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            "lyrics": "Apateu, apateu, apateu\nMeet me on the dance floor tonight\nNeon lights flashing in our eyes\nMusic is our universal home."
        },
        {
            "title": "Beautiful",
            "artist": "Bazzi",
            "album": album2,
            "duration": 180,
            "genre": "Pop",
            "trending": True,
            "artwork": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            "lyrics": "Hey, beautiful, beautiful, beautiful\nUnderneath the starlight sky\nWe listen together, side by side\nNever let this rhythm fade."
        },
        {
            "title": "Lose Control",
            "artist": "Teddy",
            "album": album4,
            "duration": 210,
            "genre": "R&B",
            "trending": True,
            "artwork": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
            "lyrics": "Something's got a hold of me\nI lose control whenever the bass drops\nCan you hear the sync on the phone?\nWe are never alone."
        },
        {
            "title": "Feel the Beat",
            "artist": "The Weeknd",
            "album": album3,
            "duration": 224,
            "genre": "Synthwave",
            "trending": True,
            "artwork": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
            "lyrics": "City of neon, highways at night\nFeel the beat pulse in your veins\nNo limits, 100% free sound\nTurn it up until the morning light."
        },
        {
            "title": "Good Luck, Babe!",
            "artist": "Chappell Roan",
            "album": album2,
            "duration": 218,
            "genre": "Pop",
            "trending": True,
            "artwork": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
            "lyrics": "You'd have to stop the world just to stop the feeling\nGood luck, babe, we're on the floor\nEvery song is unlocked and open\nSinging at the top of our lungs."
        },
        {
            "title": "Coding Beats",
            "artist": "Cyber Beats",
            "album": album5,
            "duration": 240,
            "genre": "Lo-Fi",
            "trending": False,
            "artwork": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
            "lyrics": "Focus better. Late night terminal glow.\nFlow state engaged.\nBinary pulses and soft vinyl warmth."
        },
        {
            "title": "Chill Vibes",
            "artist": "Cyber Beats",
            "album": album5,
            "duration": 195,
            "genre": "Lo-Fi",
            "trending": False,
            "artwork": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
            "lyrics": "Relax and unwind.\nOcean breeze meets mellow electric keys.\nBreath in, breath out."
        },
        {
            "title": "Workout Push",
            "artist": "Lil Nas X",
            "album": album1,
            "duration": 185,
            "genre": "Hip-Hop",
            "trending": False,
            "artwork": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop&q=80",
            "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
            "lyrics": "Push harder, one more rep.\nAdrenaline peak.\nUnstoppable energy."
        }
    ]

    all_songs = []
    for s in songs_data:
        song_obj = Song(
            title=s["title"],
            artist_id=artist_map[s["artist"]].id,
            album_id=s["album"].id,
            duration_seconds=s["duration"],
            genre=s["genre"],
            is_trending=s["trending"],
            artwork_url=s["artwork"],
            audio_url=s["audio_url"],
            lyrics=s["lyrics"],
            play_count=184000
        )
        db.add(song_obj)
        all_songs.append(song_obj)
    db.commit()

    # 5. Platform Administrator & Sample Playlists
    import secrets
    from app.core.security import hash_password
    admin_email = os.getenv("ADMIN_EMAIL", "admin@paaaaaatify.internal")
    admin_pwd = os.getenv("ADMIN_PASSWORD", "paaaaaatify_admin_secure_2026")

    # Rotate any legacy demo credentials
    legacy_demo = db.query(User).filter(User.email == "tobi@paaaaaatify.com").first()
    if legacy_demo:
        legacy_demo.hashed_password = hash_password(secrets.token_urlsafe(32))
        legacy_demo.is_admin = False
        db.commit()

    admin_user = db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        admin_user = User(
            email=admin_email,
            username="admin",
            display_name="Paaaaaaatify Admin",
            hashed_password=hash_password(admin_pwd),
            avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
            bio="Platform Administrator 🎵",
            is_verified=True,
            is_active=True,
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        user_settings = UserSettings(user_id=admin_user.id)
        db.add(user_settings)

    # 6. Default Public Curated Playlists
    existing_playlists = db.query(Playlist).filter(Playlist.user_id == admin_user.id).all()
    if not existing_playlists:
        p1 = Playlist(user_id=admin_user.id, title="Liked Songs", description="Favorite tracks curated by Paaaaaaatify", cover_art_url="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80", is_public=True)
        p2 = Playlist(user_id=admin_user.id, title="Chill Vibes", description="Relax & Unwind", cover_art_url="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80", is_public=True)
        p3 = Playlist(user_id=admin_user.id, title="Workout", description="Push Harder", cover_art_url="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&auto=format&fit=crop&q=80", is_public=True)
        p4 = Playlist(user_id=admin_user.id, title="Study Beats", description="Focus Better with Lo-Fi", cover_art_url="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80", is_public=True)
        p5 = Playlist(user_id=admin_user.id, title="Gaming Mix", description="High-energy electronic tracks", cover_art_url="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80", is_public=True)
        p6 = Playlist(user_id=admin_user.id, title="Road Trip", description="Soundtrack for the open road", cover_art_url="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop&q=80", is_public=True)
        db.add_all([p1, p2, p3, p4, p5, p6])
        db.commit()

        # Add songs to playlists
        for i, s in enumerate(all_songs):
            db.add(PlaylistSong(playlist_id=p1.id, song_id=s.id, order_index=i))
            if i % 2 == 0:
                db.add(PlaylistSong(playlist_id=p2.id, song_id=s.id, order_index=i))
                db.add(Favorite(user_id=admin_user.id, song_id=s.id))
            if i % 3 == 0:
                db.add(PlaylistSong(playlist_id=p3.id, song_id=s.id, order_index=i))

        db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="100% Free Music Streaming Platform + Real-time Group Listening Sync Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - Explicit production allowlist (unrestricted regex removed)
cors_kwargs = {
    "allow_origins": settings.cors_origins,
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    "allow_headers": ["*"],
}

# In local development mode, permit private RFC 1918 LAN subnets for testing
if settings.ENVIRONMENT == "development":
    cors_kwargs["allow_origin_regex"] = r"^https?://(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|localhost|127\.0\.0\.1)(:\d+)?$"

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Rate Limiter Middleware: Protects auth & API routes from brute-force & denial of service
from app.core.rate_limiter import RateLimiterMiddleware
app.add_middleware(RateLimiterMiddleware, default_limit=240, auth_limit=25, window_seconds=60)

# Mount Static Files
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(songs.router, prefix=settings.API_V1_STR)
app.include_router(playlists.router, prefix=settings.API_V1_STR)
app.include_router(favorites.router, prefix=settings.API_V1_STR)
app.include_router(rooms.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(recommendations.router, prefix=settings.API_V1_STR)
app.include_router(uploads.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Paaaaaaatify Core API",
        "pricing": "100% Free - No Paywalls",
        "sync_engine": "Active"
    }

# Real-time WebSockets Endpoint for Group Listening & Clock Drift Sync
@app.websocket("/ws/rooms/{room_id}")
async def room_websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(...)
):
    # Validate JWT token
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify user and room exist and are active
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
        if not room:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Security: Authorize user before allowing WebSocket connection to room
        participant = db.query(RoomParticipant).filter(
            RoomParticipant.room_id == room_id,
            RoomParticipant.user_id == user_id
        ).first()
        if not participant and room.host_id != user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await sync_engine.connect(room_id, user_id, websocket)
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            msg_type = data.get("type")

            # NTP Ping-Pong Clock Synchronization
            if msg_type == "PING":
                client_t0 = data.get("client_timestamp", 0.0)
                await sync_engine.handle_ping(websocket, client_t0)

            # Continuous Playback Drift Reporting from Device
            elif msg_type == "DRIFT_REPORT":
                client_pos = data.get("current_position_ms", 0)
                client_t = data.get("client_timestamp", 0.0)
                await sync_engine.handle_drift_report(db, room_id, user_id, client_pos, client_t)

            # Playback Control from Host
            elif msg_type in ("PLAY", "PAUSE", "SEEK", "NEXT", "PREV", "CHANGE_TRACK"):
                pos = data.get("position_ms")
                song_id = data.get("song_id")
                await sync_engine.execute_playback_command(
                    db, room_id, user_id, msg_type, position_ms=pos, song_id=song_id
                )

            # Chat / Reaction Message inside Room
            elif msg_type == "REACTION":
                emoji = data.get("emoji", "🔥")
                user = db.query(User).filter(User.id == user_id).first()
                await sync_engine.broadcast_to_room(room_id, {
                    "type": "REACTION",
                    "user_id": user_id,
                    "username": user.username if user else "User",
                    "emoji": emoji
                })

    except WebSocketDisconnect:
        await sync_engine.disconnect(room_id, user_id)
    finally:
        db.close()

