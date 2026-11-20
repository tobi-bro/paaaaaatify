from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User, Artist
from app.schemas.schemas import SongOut, ArtistOut
from app.api.deps import get_current_user_optional
from app.api.songs import song_to_out
from app.services.recommendation import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Recommendations Engine"])

@router.get("/made-for-you", response_model=List[SongOut])
def get_made_for_you(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else "default"
    songs = recommendation_service.get_made_for_you(db, user_id)
    fav_ids = {f.song_id for f in current_user.favorites} if current_user else set()
    return [song_to_out(s, s.id in fav_ids) for s in songs]

@router.get("/trending", response_model=List[SongOut])
def get_trending(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    songs = recommendation_service.get_trending(db)
    fav_ids = {f.song_id for f in current_user.favorites} if current_user else set()
    return [song_to_out(s, s.id in fav_ids) for s in songs]

@router.get("/recently-played", response_model=List[SongOut])
def get_recently_played(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else "default"
    songs = recommendation_service.get_recently_played(db, user_id)
    fav_ids = {f.song_id for f in current_user.favorites} if current_user else set()
    return [song_to_out(s, s.id in fav_ids) for s in songs]

@router.get("/popular-artists", response_model=List[ArtistOut])
def get_popular_artists(db: Session = Depends(get_db)):
    artists = db.query(Artist).order_by(Artist.monthly_listeners.desc()).limit(10).all()
    return [ArtistOut.model_validate(a) for a in artists]

@router.get("/daily-mix", response_model=List[SongOut])
def get_daily_mix(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else "default"
    songs = recommendation_service.get_daily_mix(db, user_id)
    fav_ids = {f.song_id for f in current_user.favorites} if current_user else set()
    return [song_to_out(s, s.id in fav_ids) for s in songs]

