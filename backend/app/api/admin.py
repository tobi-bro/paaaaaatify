import os
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, Room, Song, Playlist
from app.api.deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin & System Control"])

# In-memory operational audit log store
OPERATIONAL_LOGS = [
    {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "INFO",
        "action": "SYSTEM_START",
        "details": "Paaaaaaatify Core Audio Engine initialized successfully."
    }
]

# Modular Authorized Music Providers Catalog
MUSIC_PROVIDERS = [
    {
        "id": "soundhelix",
        "name": "SoundHelix Open Audio",
        "type": "Public Domain / CC",
        "is_enabled": True,
        "description": "Public algorithmic and creative commons audio streams for high-fidelity testing.",
        "tracks_count": 9
    },
    {
        "id": "jamendo",
        "name": "Jamendo Open API",
        "type": "Licensed Creative Commons",
        "is_enabled": True,
        "description": "Legally authorized royalty-free and CC-licensed indie artist catalog.",
        "tracks_count": 250
    },
    {
        "id": "fma",
        "name": "Free Music Archive (FMA)",
        "type": "Open Music License",
        "is_enabled": True,
        "description": "Curated legal library of high-quality, legal audio downloads directed by WFMU.",
        "tracks_count": 120
    },
    {
        "id": "user_uploads",
        "name": "User Direct Audio Assets",
        "type": "User-Owned Files",
        "is_enabled": True,
        "description": "User-uploaded audio files hosted in encrypted local persistent storage.",
        "tracks_count": 15
    }
]

class UserStatusUpdate(BaseModel):
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None

class ProviderToggle(BaseModel):
    is_enabled: bool

@router.get("/health")
def get_system_health(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_rooms = db.query(Room).filter(Room.is_active == True).count()
    total_songs = db.query(Song).filter(Song.is_active == True).count()
    total_playlists = db.query(Playlist).count()

    db_path = "paaaaaatify.db"
    db_size_kb = os.path.getsize(db_path) / 1024 if os.path.exists(db_path) else 0

    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "database": {
            "type": "SQLite (Development)" if "sqlite" in str(db.bind.url) else "PostgreSQL (Production)",
            "size_kb": round(db_size_kb, 2),
            "status": "connected"
        },
        "metrics": {
            "total_users": total_users,
            "active_users": active_users,
            "active_rooms": total_rooms,
            "active_songs": total_songs,
            "total_playlists": total_playlists
        },
        "audio_engine": {
            "status": "operational",
            "sync_engine": "active",
            "copyright_enforcement": "strict_legal_only"
        }
    }

@router.get("/users")
def list_registered_users(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).limit(100).all()
    out = []
    for u in users:
        pl_count = db.query(Playlist).filter(Playlist.user_id == u.id).count()
        out.append({
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "google_id": bool(u.google_id),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "playlists_count": pl_count
        })
    return out

@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    update: UserStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if user_id == admin.id and update.is_admin is False:
        raise HTTPException(status_code=400, detail="Cannot revoke your own administrative privileges")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if update.is_active is not None:
        target.is_active = update.is_active
    if update.is_admin is not None:
        target.is_admin = update.is_admin

    db.commit()

    OPERATIONAL_LOGS.insert(0, {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "AUDIT",
        "action": "USER_STATUS_CHANGE",
        "details": f"Admin {admin.username} updated user {target.username} (active: {target.is_active}, admin: {target.is_admin})"
    })

    return {
        "status": "success",
        "user_id": target.id,
        "is_active": target.is_active,
        "is_admin": target.is_admin
    }

@router.get("/rooms")
def list_active_rooms(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    rooms = db.query(Room).filter(Room.is_active == True).all()
    out = []
    for r in rooms:
        out.append({
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "host_id": r.host_id,
            "host_username": r.host.username if r.host else "Unknown",
            "participants_count": len(r.participants),
            "current_song": r.current_song.title if r.current_song else None,
            "playback_state": r.playback_state,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })
    return out

@router.get("/providers")
def list_music_providers(admin: User = Depends(get_current_admin)):
    return MUSIC_PROVIDERS

@router.post("/providers/{provider_id}/toggle")
def toggle_music_provider(
    provider_id: str,
    toggle: ProviderToggle,
    admin: User = Depends(get_current_admin)
):
    for p in MUSIC_PROVIDERS:
        if p["id"] == provider_id:
            p["is_enabled"] = toggle.is_enabled
            OPERATIONAL_LOGS.insert(0, {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "level": "AUDIT",
                "action": "PROVIDER_TOGGLE",
                "details": f"Admin {admin.username} toggled provider {provider_id} to {toggle.is_enabled}"
            })
            return p
    raise HTTPException(status_code=404, detail="Provider not found")

@router.get("/logs")
def get_operational_logs(admin: User = Depends(get_current_admin)):
    return OPERATIONAL_LOGS[:50]

