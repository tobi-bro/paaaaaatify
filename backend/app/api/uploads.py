import os
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Song, AudioAsset, User, Artist
from app.schemas.schemas import SongOut
from app.api.deps import get_current_user
from app.api.songs import song_to_out

router = APIRouter(prefix="/uploads", tags=["User Audio Uploads"])

ALLOWED_EXTENSIONS = {".mp3", ".m4a", ".aac", ".wav", ".ogg"}
ALLOWED_MIME_TYPES = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave",
    "audio/ogg", "audio/vorbis", "audio/aac", "audio/x-m4a", "audio/mp4",
    "application/octet-stream"
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

def validate_audio_magic_bytes(header: bytes, ext: str) -> bool:
    if len(header) < 4:
        return False
    if ext == ".mp3":
        return header.startswith(b"ID3") or (header[0] == 0xFF and (header[1] & 0xE0) == 0xE0)
    elif ext == ".wav":
        return header.startswith(b"RIFF")
    elif ext == ".ogg":
        return header.startswith(b"OggS")
    elif ext in (".m4a", ".aac"):
        return b"ftyp" in header[:16] or (header[0] == 0xFF and (header[1] & 0xF0) == 0xF0)
    return True

@router.post("/audio", response_model=SongOut)
async def upload_audio_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext}'. Supported: MP3, M4A, AAC, WAV, OGG."
        )

    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MIME type '{file.content_type}'. Must be an audio file."
        )

    file_id = str(uuid.uuid4())
    stored_filename = f"{file_id}{ext}"
    dest_path = os.path.join(settings.UPLOADS_DIR, stored_filename)

    # Stream chunks to disk with size validation to avoid loading 50MB into RAM
    total_size = 0
    header_bytes = b""
    try:
        with open(dest_path, "wb") as f:
            while True:
                chunk = await file.read(64 * 1024)
                if not chunk:
                    break
                if len(header_bytes) < 32:
                    header_bytes += chunk[:32 - len(header_bytes)]
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    raise HTTPException(status_code=400, detail="Audio file exceeds 50MB limit.")
                f.write(chunk)
    except HTTPException:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")

    if not validate_audio_magic_bytes(header_bytes, ext):
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(
            status_code=400,
            detail="File content does not match genuine audio signatures."
        )

    # Temporary storage expires in 48 hours for shared sessions
    expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

    # Create audio asset
    asset = AudioAsset(
        id=file_id,
        file_path=dest_path,
        file_format=ext.replace(".", ""),
        file_size_bytes=total_size,
        is_user_uploaded=True,
        uploaded_by_user_id=current_user.id,
        expires_at=expires_at
    )
    db.add(asset)

    # Find or create user artist profile
    artist_name = current_user.display_name or current_user.username
    artist = db.query(Artist).filter(Artist.name == artist_name).first()
    if not artist:
        artist = Artist(name=artist_name, bio="Independent Creator on Paaaaaaatify")
        db.add(artist)
        db.commit()
        db.refresh(artist)

    clean_title = os.path.splitext(file.filename)[0].replace("-", " ").replace("_", " ").title()

    # Create song entry
    song = Song(
        title=clean_title,
        artist_id=artist.id,
        audio_asset_id=asset.id,
        audio_url=f"/api/v1/uploads/stream/{stored_filename}",
        artwork_url="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
        duration_seconds=210,
        genre="User Audio",
        release_year=datetime.now().year,
        is_active=True
    )
    db.add(song)
    db.commit()
    db.refresh(song)

    return song_to_out(song, False)

@router.get("/stream/{filename}")
async def stream_uploaded_audio(filename: str):
    safe_name = os.path.basename(filename)
    file_path = os.path.join(settings.UPLOADS_DIR, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found or expired")
    
    media_map = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
    }
    ext = os.path.splitext(safe_name)[1].lower()
    media_type = media_map.get(ext, "audio/mpeg")
    return FileResponse(file_path, media_type=media_type)
