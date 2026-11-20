import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.config import settings
from app.models.models import Song, Artist, Album, Genre, ListeningHistory, User
from app.schemas.schemas import SongOut, GenreOut
from app.api.deps import get_current_user_optional, get_current_user

router = APIRouter(prefix="/songs", tags=["Songs"])

def song_to_out(song: Song, is_favorite: bool = False) -> SongOut:
    return SongOut(
        id=song.id,
        title=song.title,
        artist_id=song.artist_id,
        artist_name=song.artist.name if song.artist else "Unknown Artist",
        album_id=song.album_id,
        album_title=song.album.title if song.album else None,
        audio_url=song.audio_url,
        artwork_url=song.artwork_url,
        duration_seconds=song.duration_seconds,
        genre=song.genre,
        release_year=song.release_year,
        play_count=song.play_count,
        lyrics=song.lyrics,
        is_trending=song.is_trending,
        is_favorite=is_favorite
    )

@router.get("", response_model=List[SongOut])
def get_songs(
    genre: Optional[str] = None,
    search: Optional[str] = None,
    trending: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Song).filter(Song.is_active == True)
    
    if genre and genre.lower() != "all":
        query = query.filter(Song.genre.ilike(genre))
    
    if search:
        search_term = f"%{search}%"
        query = query.join(Artist, Song.artist_id == Artist.id).filter(
            or_(
                Song.title.ilike(search_term),
                Artist.name.ilike(search_term),
                Song.genre.ilike(search_term)
            )
        )
    
    if trending is not None:
        query = query.filter(Song.is_trending == trending)

    songs = query.offset(offset).limit(limit).all()

    # check favorites for authenticated user
    fav_ids = set()
    if current_user:
        fav_ids = {f.song_id for f in current_user.favorites}

    return [song_to_out(s, s.id in fav_ids) for s in songs]

@router.get("/genres", response_model=List[GenreOut])
def get_genres(db: Session = Depends(get_db)):
    genres = db.query(Genre).all()
    return [GenreOut.model_validate(g) for g in genres]

@router.get("/{song_id}", response_model=SongOut)
def get_song(
    song_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    is_favorite = False
    if current_user:
        is_favorite = any(f.song_id == song.id for f in current_user.favorites)
        
    return song_to_out(song, is_favorite)

@router.post("/{song_id}/play")
def record_play(
    song_id: str,
    duration_played: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    
    song.play_count += 1
    
    if current_user:
        history_entry = ListeningHistory(
            user_id=current_user.id,
            song_id=song.id,
            duration_played_seconds=duration_played
        )
        db.add(history_entry)
        
    db.commit()
    return {"status": "ok", "play_count": song.play_count}

@router.get("/{song_id}/stream")
async def stream_song(song_id: str, request: Request, db: Session = Depends(get_db)):
    """
    HTTP Range Requests Audio Streaming (RFC 7233).
    Essential for Android Media3/ExoPlayer seek and background buffering.
    """
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    # If audio_url is local filename
    file_path = os.path.join(settings.AUDIO_DIR, f"{song.id}.mp3")
    if not os.path.exists(file_path):
        # Fallback to general static audio or demo sound
        file_path = os.path.join(settings.AUDIO_DIR, "demo.mp3")
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found on disk")

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    if not range_header:
        return FileResponse(file_path, media_type="audio/mpeg")

    # Range: bytes=start-end
    range_str = range_header.replace("bytes=", "")
    parts = range_str.split("-")
    start = int(parts[0]) if parts[0] else 0
    end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1

    if start >= file_size or end >= file_size or start > end:
        raise HTTPException(status_code=416, detail="Requested range not satisfiable")

    chunk_size = (end - start) + 1

    def iter_file():
        with open(file_path, "rb") as f:
            f.seek(start)
            bytes_left = chunk_size
            while bytes_left > 0:
                read_size = min(bytes_left, 64 * 1024)
                data = f.read(read_size)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": "audio/mpeg",
    }

    return StreamingResponse(iter_file(), status_code=206, headers=headers)

