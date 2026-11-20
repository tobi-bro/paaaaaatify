from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Table
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    display_name = Column(String(150), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(String(500), nullable=True, default="Music Lover • Dream Big 🎵")
    is_verified = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    playlists = relationship("Playlist", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    history = relationship("ListeningHistory", back_populates="user", cascade="all, delete-orphan")
    hosted_rooms = relationship("Room", back_populates="host")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    notifications = Column(Boolean, default=True)
    audio_quality = Column(String(50), default="high")  # standard, high, lossless
    dark_mode = Column(Boolean, default=True)
    data_saver = Column(Boolean, default=False)
    offline_sync = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="settings")

class Genre(Base):
    __tablename__ = "genres"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, index=True, nullable=False)
    icon = Column(String(50), default="🎵")
    gradient = Column(String(100), default="from-blue-600 to-indigo-900")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Artist(Base):
    __tablename__ = "artists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(200), index=True, nullable=False)
    bio = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    monthly_listeners = Column(Integer, default=1250000)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    albums = relationship("Album", back_populates="artist")
    songs = relationship("Song", back_populates="artist")

class Album(Base):
    __tablename__ = "albums"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), index=True, nullable=False)
    artist_id = Column(String(36), ForeignKey("artists.id"), nullable=False)
    cover_art_url = Column(String(500), nullable=True)
    release_date = Column(String(50), nullable=True)
    genre = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    artist = relationship("Artist", back_populates="albums")
    songs = relationship("Song", back_populates="album")

class AudioAsset(Base):
    __tablename__ = "audio_assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    file_path = Column(String(500), nullable=False)
    file_format = Column(String(20), default="mp3")
    file_size_bytes = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    bitrate = Column(Integer, default=320)
    is_user_uploaded = Column(Boolean, default=False)
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Song(Base):
    __tablename__ = "songs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), index=True, nullable=False)
    artist_id = Column(String(36), ForeignKey("artists.id"), nullable=False)
    album_id = Column(String(36), ForeignKey("albums.id"), nullable=True)
    audio_asset_id = Column(String(36), ForeignKey("audio_assets.id"), nullable=True)
    audio_url = Column(String(500), nullable=False)
    artwork_url = Column(String(500), nullable=True)
    duration_seconds = Column(Integer, default=210)  # in seconds e.g. 212 = 3:32
    genre = Column(String(100), default="Pop", index=True)
    release_year = Column(Integer, default=2024)
    play_count = Column(Integer, default=0)
    lyrics = Column(Text, nullable=True)
    is_trending = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    artist = relationship("Artist", back_populates="songs")
    album = relationship("Album", back_populates="songs")
    playlist_entries = relationship("PlaylistSong", back_populates="song")

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    cover_art_url = Column(String(500), nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="playlists")
    songs = relationship("PlaylistSong", back_populates="playlist", cascade="all, delete-orphan", order_by="PlaylistSong.order_index")

class PlaylistSong(Base):
    __tablename__ = "playlist_songs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    playlist_id = Column(String(36), ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, default=0)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    playlist = relationship("Playlist", back_populates="songs")
    song = relationship("Song", back_populates="playlist_entries")

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="favorites")
    song = relationship("Song")

class ListeningHistory(Base):
    __tablename__ = "listening_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    played_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    duration_played_seconds = Column(Integer, default=0)

    user = relationship("User", back_populates="history")
    song = relationship("Song")

class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(20), unique=True, index=True, nullable=False)  # e.g. PAAAA-8427
    name = Column(String(100), default="Group Listening Session")
    host_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    current_song_id = Column(String(36), ForeignKey("songs.id"), nullable=True)
    playback_state = Column(String(20), default="PAUSED")  # PLAYING, PAUSED, BUFFERING
    current_position_ms = Column(Integer, default=0)
    server_timestamp = Column(Float, default=0.0)  # Unix timestamp seconds with fractional ms
    sequence_num = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_private = Column(Boolean, default=False)
    max_participants = Column(Integer, default=25)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    host = relationship("User", back_populates="hosted_rooms")
    current_song = relationship("Song")
    participants = relationship("RoomParticipant", back_populates="room", cascade="all, delete-orphan")
    queue_items = relationship("RoomQueueItem", back_populates="room", cascade="all, delete-orphan", order_by="RoomQueueItem.order_index")
    events = relationship("PlaybackEvent", back_populates="room", cascade="all, delete-orphan")

class RoomParticipant(Base):
    __tablename__ = "room_participants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_seen_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_ready = Column(Boolean, default=True)
    drift_ms = Column(Float, default=0.0)
    connection_status = Column(String(30), default="SYNCHRONIZED")  # CONNECTED, BUFFERING, SYNCHRONIZED, RECONNECTING

    room = relationship("Room", back_populates="participants")
    user = relationship("User")

class RoomQueueItem(Base):
    __tablename__ = "room_queue"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    song_id = Column(String(36), ForeignKey("songs.id", ondelete="CASCADE"), nullable=False)
    added_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    room = relationship("Room", back_populates="queue_items")
    song = relationship("Song")
    added_by_user = relationship("User")

class PlaybackEvent(Base):
    __tablename__ = "playback_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    room_id = Column(String(36), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)  # PLAY, PAUSE, SEEK, TRACK_CHANGE, SYNC_CHECK
    song_id = Column(String(36), ForeignKey("songs.id"), nullable=True)
    position_ms = Column(Integer, default=0)
    server_timestamp = Column(Float, nullable=False)
    sequence_num = Column(Integer, nullable=False)
    triggered_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    room = relationship("Room", back_populates="events")
    user = relationship("User")

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    token = Column(String(500), unique=True, index=True, nullable=False)
    revoked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)


