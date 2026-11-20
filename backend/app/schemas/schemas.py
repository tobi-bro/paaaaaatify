from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# Auth & User
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token
    client_id: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"

class TokenRefresh(BaseModel):
    refresh_token: str

class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class UserOut(BaseModel):
    id: str
    email: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_verified: bool
    is_admin: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserStats(BaseModel):
    playlists_count: int
    followers_count: int
    following_count: int
    favorites_count: int
    listening_hours: float

# Settings
class UserSettingsOut(BaseModel):
    notifications: bool
    audio_quality: str
    dark_mode: bool
    data_saver: bool
    offline_sync: bool

    model_config = ConfigDict(from_attributes=True)

class UserSettingsUpdate(BaseModel):
    notifications: Optional[bool] = None
    audio_quality: Optional[str] = None
    dark_mode: Optional[bool] = None
    data_saver: Optional[bool] = None
    offline_sync: Optional[bool] = None

# Artists, Albums, Songs
class ArtistOut(BaseModel):
    id: str
    name: str
    bio: Optional[str] = None
    image_url: Optional[str] = None
    monthly_listeners: int

    model_config = ConfigDict(from_attributes=True)

class AlbumOut(BaseModel):
    id: str
    title: str
    artist_id: str
    cover_art_url: Optional[str] = None
    release_date: Optional[str] = None
    genre: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SongOut(BaseModel):
    id: str
    title: str
    artist_id: str
    artist_name: Optional[str] = None
    album_id: Optional[str] = None
    album_title: Optional[str] = None
    audio_url: str
    artwork_url: Optional[str] = None
    duration_seconds: int
    genre: str
    release_year: int
    play_count: int
    lyrics: Optional[str] = None
    is_trending: bool = False
    is_favorite: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

class GenreOut(BaseModel):
    id: str
    name: str
    icon: str
    gradient: str

    model_config = ConfigDict(from_attributes=True)

# Playlists
class PlaylistCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    cover_art_url: Optional[str] = None
    is_public: bool = True

class PlaylistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_art_url: Optional[str] = None
    is_public: Optional[bool] = None

class PlaylistOut(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    cover_art_url: Optional[str] = None
    is_public: bool
    song_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PlaylistSongAdd(BaseModel):
    song_id: str

class PlaylistDetailOut(PlaylistOut):
    songs: List[SongOut] = []

# Favorites
class FavoriteOut(BaseModel):
    id: str
    user_id: str
    song_id: str
    song: SongOut
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Group Listening Room
class RoomCreate(BaseModel):
    name: Optional[str] = "Group Listening Session"
    is_private: bool = False
    initial_song_id: Optional[str] = None

class RoomJoin(BaseModel):
    code: str

class RoomParticipantOut(BaseModel):
    id: str
    user_id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_host: bool = False
    is_ready: bool = True
    drift_ms: float = 0.0
    connection_status: str = "SYNCHRONIZED"

class RoomQueueItemOut(BaseModel):
    id: str
    song: SongOut
    added_by: UserOut
    order_index: int

class RoomOut(BaseModel):
    id: str
    code: str
    name: str
    host_id: str
    host_username: Optional[str] = None
    current_song: Optional[SongOut] = None
    playback_state: str  # PLAYING, PAUSED
    current_position_ms: int
    server_timestamp: float
    sequence_num: int
    participants_count: int
    participants: List[RoomParticipantOut] = []
    queue: List[RoomQueueItemOut] = []
    is_host: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

class PlaybackCommand(BaseModel):
    action: str  # PLAY, PAUSE, SEEK, NEXT, PREV, QUEUE_ADD
    position_ms: Optional[int] = None
    song_id: Optional[str] = None

class DriftReport(BaseModel):
    current_position_ms: int
    client_timestamp: float
