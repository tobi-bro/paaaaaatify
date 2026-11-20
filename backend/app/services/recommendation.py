from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.models import Song, Favorite, ListeningHistory, Artist, Genre, User

class RecommendationService:
    @staticmethod
    def get_user_preferred_genres(db: Session, user_id: str, limit: int = 3) -> List[str]:
        # Aggregate from favorites and listening history
        fav_genres = (
            db.query(Song.genre, func.count(Song.genre).label("cnt"))
            .join(Favorite, Favorite.song_id == Song.id)
            .filter(Favorite.user_id == user_id)
            .group_by(Song.genre)
            .order_by(desc("cnt"))
            .limit(limit)
            .all()
        )
        if fav_genres:
            return [g[0] for g in fav_genres]
        
        # Fallback to history
        hist_genres = (
            db.query(Song.genre, func.count(Song.genre).label("cnt"))
            .join(ListeningHistory, ListeningHistory.song_id == Song.id)
            .filter(ListeningHistory.user_id == user_id)
            .group_by(Song.genre)
            .order_by(desc("cnt"))
            .limit(limit)
            .all()
        )
        if hist_genres:
            return [g[0] for g in hist_genres]
        
        # Default top genres
        return ["Hip-Hop", "Synthwave", "Pop", "Lo-Fi", "Rock"]

    @staticmethod
    def get_made_for_you(db: Session, user_id: str, limit: int = 10) -> List[Song]:
        genres = RecommendationService.get_user_preferred_genres(db, user_id)
        # Fetch songs matching user's top genres, mixed with popular tracks
        songs = (
            db.query(Song)
            .filter(Song.genre.in_(genres), Song.is_active == True)
            .order_by(desc(Song.play_count))
            .limit(limit)
            .all()
        )
        if len(songs) < limit:
            fallback = (
                db.query(Song)
                .filter(Song.is_active == True)
                .order_by(desc(Song.play_count))
                .limit(limit)
                .all()
            )
            return fallback
        return songs

    @staticmethod
    def get_trending(db: Session, limit: int = 10) -> List[Song]:
        return (
            db.query(Song)
            .filter(Song.is_active == True)
            .order_by(desc(Song.play_count))
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_recently_played(db: Session, user_id: str, limit: int = 10) -> List[Song]:
        history_items = (
            db.query(ListeningHistory)
            .filter(ListeningHistory.user_id == user_id)
            .order_by(desc(ListeningHistory.played_at))
            .limit(limit)
            .all()
        )
        seen_song_ids = set()
        recent_songs = []
        for h in history_items:
            if h.song_id not in seen_song_ids and h.song:
                seen_song_ids.add(h.song_id)
                recent_songs.append(h.song)
        
        # If user has no history yet, return curated recent releases
        if not recent_songs:
            recent_songs = (
                db.query(Song)
                .filter(Song.is_active == True)
                .order_by(desc(Song.created_at))
                .limit(limit)
                .all()
            )
        return recent_songs

    @staticmethod
    def get_daily_mix(db: Session, user_id: str, limit: int = 15) -> List[Song]:
        genres = RecommendationService.get_user_preferred_genres(db, user_id)
        return (
            db.query(Song)
            .filter(Song.is_active == True)
            .order_by(func.random() if db.bind.name == "postgresql" else func.random())
            .limit(limit)
            .all()
        )

recommendation_service = RecommendationService()

