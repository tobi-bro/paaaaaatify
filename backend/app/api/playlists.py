from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Playlist, PlaylistSong, Song, User
from app.schemas.schemas import (
    PlaylistCreate, PlaylistUpdate, PlaylistOut, PlaylistDetailOut, PlaylistSongAdd, SongOut
)
from app.api.deps import get_current_user
from app.api.songs import song_to_out

router = APIRouter(prefix="/playlists", tags=["Playlists"])

@router.get("", response_model=List[PlaylistOut])
def get_user_playlists(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlists = db.query(Playlist).filter(Playlist.user_id == current_user.id).all()
    results = []
    for p in playlists:
        out = PlaylistOut(
            id=p.id,
            user_id=p.user_id,
            title=p.title,
            description=p.description,
            cover_art_url=p.cover_art_url,
            is_public=p.is_public,
            song_count=len(p.songs),
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        results.append(out)
    return results

@router.post("", response_model=PlaylistOut, status_code=status.HTTP_201_CREATED)
def create_playlist(
    playlist_in: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = Playlist(
        user_id=current_user.id,
        title=playlist_in.title,
        description=playlist_in.description,
        cover_art_url=playlist_in.cover_art_url or "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
        is_public=playlist_in.is_public
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)

    return PlaylistOut(
        id=playlist.id,
        user_id=playlist.user_id,
        title=playlist.title,
        description=playlist.description,
        cover_art_url=playlist.cover_art_url,
        is_public=playlist.is_public,
        song_count=0,
        created_at=playlist.created_at,
        updated_at=playlist.updated_at
    )

@router.get("/{playlist_id}", response_model=PlaylistDetailOut)
def get_playlist_details(playlist_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # IDOR Protection: Private playlists are accessible only by their owner
    if not playlist.is_public and playlist.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to private playlist")
    
    fav_ids = {f.song_id for f in current_user.favorites}
    songs_out = []
    for ps in playlist.songs:
        if ps.song and ps.song.is_active:
            songs_out.append(song_to_out(ps.song, ps.song.id in fav_ids))

    return PlaylistDetailOut(
        id=playlist.id,
        user_id=playlist.user_id,
        title=playlist.title,
        description=playlist.description,
        cover_art_url=playlist.cover_art_url,
        is_public=playlist.is_public,
        song_count=len(songs_out),
        created_at=playlist.created_at,
        updated_at=playlist.updated_at,
        songs=songs_out
    )

@router.put("/{playlist_id}", response_model=PlaylistOut)
def update_playlist(
    playlist_id: str,
    playlist_update: PlaylistUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or permission denied")

    if playlist_update.title is not None:
        playlist.title = playlist_update.title
    if playlist_update.description is not None:
        playlist.description = playlist_update.description
    if playlist_update.cover_art_url is not None:
        playlist.cover_art_url = playlist_update.cover_art_url
    if playlist_update.is_public is not None:
        playlist.is_public = playlist_update.is_public

    db.commit()
    db.refresh(playlist)

    return PlaylistOut(
        id=playlist.id,
        user_id=playlist.user_id,
        title=playlist.title,
        description=playlist.description,
        cover_art_url=playlist.cover_art_url,
        is_public=playlist.is_public,
        song_count=len(playlist.songs),
        created_at=playlist.created_at,
        updated_at=playlist.updated_at
    )

@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or permission denied")

    db.delete(playlist)
    db.commit()
    return {"status": "ok", "message": "Playlist deleted successfully"}

@router.post("/{playlist_id}/songs")
def add_song_to_playlist(
    playlist_id: str,
    song_add: PlaylistSongAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or permission denied")

    song = db.query(Song).filter(Song.id == song_add.song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    existing_entry = db.query(PlaylistSong).filter(
        PlaylistSong.playlist_id == playlist_id,
        PlaylistSong.song_id == song.id
    ).first()
    if existing_entry:
        return {"status": "ok", "message": "Song already in playlist"}

    order_index = len(playlist.songs)
    new_entry = PlaylistSong(playlist_id=playlist.id, song_id=song.id, order_index=order_index)
    db.add(new_entry)
    db.commit()

    return {"status": "ok", "message": "Song added to playlist"}

@router.delete("/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(
    playlist_id: str,
    song_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or permission denied")

    entry = db.query(PlaylistSong).filter(
        PlaylistSong.playlist_id == playlist_id,
        PlaylistSong.song_id == song_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Song not in playlist")

    db.delete(entry)
    db.commit()
    return {"status": "ok", "message": "Song removed from playlist"}

