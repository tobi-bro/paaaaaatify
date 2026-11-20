from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Favorite, Song, User
from app.schemas.schemas import SongOut
from app.api.deps import get_current_user
from app.api.songs import song_to_out

router = APIRouter(prefix="/favorites", tags=["Favorites"])

@router.get("", response_model=List[SongOut])
def get_user_favorites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(Favorite).filter(Favorite.user_id == current_user.id).order_by(Favorite.created_at.desc()).all()
    results = []
    for f in favs:
        if f.song and f.song.is_active:
            results.append(song_to_out(f.song, True))
    return results

@router.post("/{song_id}")
def add_favorite(song_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    existing = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.song_id == song_id).first()
    if not existing:
        fav = Favorite(user_id=current_user.id, song_id=song_id)
        db.add(fav)
        db.commit()

    return {"status": "ok", "is_favorite": True}

@router.delete("/{song_id}")
def remove_favorite(song_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.song_id == song_id).first()
    if fav:
        db.delete(fav)
        db.commit()

    return {"status": "ok", "is_favorite": False}

@router.post("/{song_id}/toggle")
def toggle_favorite(song_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    fav = db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.song_id == song_id).first()
    if fav:
        db.delete(fav)
        db.commit()
        return {"status": "ok", "is_favorite": False}
    else:
        new_fav = Favorite(user_id=current_user.id, song_id=song_id)
        db.add(new_fav)
        db.commit()
        return {"status": "ok", "is_favorite": True}

