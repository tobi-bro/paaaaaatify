export interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface UserStats {
  playlists_count: number;
  followers_count: number;
  following_count: number;
  favorites_count: number;
  listening_hours: number;
}

export interface UserSettings {
  notifications: boolean;
  audio_quality: string;
  dark_mode: boolean;
  data_saver: boolean;
  offline_sync: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist_id: string;
  artist_name?: string;
  album_id?: string;
  album_title?: string;
  audio_url: string;
  artwork_url?: string;
  duration_seconds: number;
  genre: string;
  release_year: number;
  play_count: number;
  lyrics?: string;
  is_trending?: boolean;
  is_favorite?: boolean;
}

export interface Artist {
  id: string;
  name: string;
  bio?: string;
  image_url?: string;
  monthly_listeners: number;
}

export interface Album {
  id: string;
  title: string;
  artist_id: string;
  cover_art_url?: string;
  release_date?: string;
  genre?: string;
}

export interface Genre {
  id: string;
  name: string;
  icon: string;
  gradient: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_art_url?: string;
  is_public: boolean;
  song_count: number;
  created_at: string;
  updated_at: string;
  songs?: Song[];
}

export interface RoomParticipant {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  is_host: boolean;
  is_ready: boolean;
  drift_ms: number;
  connection_status: 'CONNECTED' | 'BUFFERING' | 'SYNCHRONIZED' | 'RECONNECTING';
}

export interface RoomQueueItem {
  id: string;
  song: Song;
  added_by: User;
  order_index: number;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  host_id: string;
  host_username?: string;
  current_song?: Song;
  playback_state: 'PLAYING' | 'PAUSED';
  current_position_ms: number;
  server_timestamp: number;
  sequence_num: number;
  participants_count: number;
  participants: RoomParticipant[];
  queue: RoomQueueItem[];
  is_host?: boolean;
}

