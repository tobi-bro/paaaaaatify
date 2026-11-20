import { Capacitor } from '@capacitor/core';
import {
  User, UserStats, UserSettings, Song, Playlist, Genre, Artist, Room
} from '../types';

// Storage key for user-configured backend URL on physical device or custom deployments
const CUSTOM_API_URL_KEY = 'paaaaaatify_custom_api_url';

export interface ApiUrlValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validates and normalizes an API base URL:
 * - Requires https:// in production release builds
 * - Strictly rejects localhost, emulator, and loopback IPs in production
 * - Automatically normalizes trailing slashes and ensures /api/v1 path
 */
export const validateApiUrl = (rawUrl: string): ApiUrlValidationResult => {
  if (!rawUrl || !rawUrl.trim()) {
    return { valid: false, error: 'API URL cannot be empty.' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Please include protocol (e.g. https://api.yourdomain.com/api/v1).'
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      error: 'Protocol must be https:// (or http:// in local development).'
    };
  }

  const isPrivateOrLoopback =
    /^(localhost|\[?::1\]?|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|.*\.local)$/i.test(
      parsed.hostname
    );

  // Production security: Android release network-security blocks cleartext HTTP,
  // and production requests must never accidentally target localhost or local emulators.
  if (import.meta.env.PROD) {
    if (parsed.protocol === 'http:') {
      return {
        valid: false,
        error: 'Production builds require secure HTTPS. Cleartext HTTP is blocked in release.'
      };
    }
    if (isPrivateOrLoopback) {
      return {
        valid: false,
        error: 'Localhost, emulator, and private network addresses are not permitted in production release builds.'
      };
    }
  }

  // Normalize path: remove trailing slashes, collapse duplicate /api/v1 or /api segments, and append /api/v1
  let pathname = parsed.pathname.replace(/\/+$/, '');
  pathname = pathname.replace(/(?:\/api(?:\/v1)?)+$/i, '');
  pathname = `${pathname}/api/v1`;

  const normalized = `${parsed.protocol}//${parsed.host}${pathname}`;
  return { valid: true, normalized };
};

export const getStoredApiUrl = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem(CUSTOM_API_URL_KEY);
    if (stored && stored.trim()) {
      const validation = validateApiUrl(stored.trim());
      if (validation.valid && validation.normalized) {
        return validation.normalized;
      }
      // Clean invalid or dev-only URLs when running in production
      localStorage.removeItem(CUSTOM_API_URL_KEY);
    }
  }
  return null;
};

export const setStoredApiUrl = (url: string): { success: boolean; error?: string; normalized?: string } => {
  const validation = validateApiUrl(url);
  if (!validation.valid || !validation.normalized) {
    return { success: false, error: validation.error || 'Invalid API URL' };
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(CUSTOM_API_URL_KEY, validation.normalized);
  }
  return { success: true, normalized: validation.normalized };
};

export const resetStoredApiUrl = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(CUSTOM_API_URL_KEY);
  }
};

/**
 * Checks whether the application has an active, valid backend URL configured.
 */
export const isBackendConfigured = (): boolean => {
  return getApiBaseUrl().length > 0;
};

/**
 * Resolves the Backend API Base URL using strict environment-based configuration:
 * 1. Runtime User-Configured Override (from in-app settings / dialog, validated & stored in localStorage)
 * 2. Environment Variable: VITE_API_URL (set at build-time or in frontend/.env for production HTTPS)
 * 3. Production Web: Same-origin /api/v1 when hosted on a public domain
 * 4. Development/Debug Only:
 *    - Web Browser: http://localhost:8000/api/v1
 *    - Android Native Emulator: http://10.0.2.2:8000/api/v1
 * 5. Production Release (Native Android or unconfigured):
 *    - NEVER falls back to localhost or emulator loopback.
 *    - Returns "" if unconfigured, prompting user to configure their backend URL.
 */
export const getApiBaseUrl = (): string => {
  // 1. Valid user-configured production HTTPS URL takes priority
  const custom = getStoredApiUrl();
  if (custom) {
    return custom;
  }

  // 2. Valid VITE_API_URL takes priority when configured
  const meta = import.meta as any;
  if (meta && meta.env && meta.env.VITE_API_URL && typeof meta.env.VITE_API_URL === 'string') {
    const envUrl = meta.env.VITE_API_URL.trim();
    if (envUrl) {
      const validation = validateApiUrl(envUrl);
      if (validation.valid && validation.normalized) {
        return validation.normalized;
      }
    }
  }

  // 3. Detect Native Android platform BEFORE attempting Web same-origin fallback
  if (Capacitor.isNativePlatform()) {
    // Debug builds may use local development URLs ONLY under explicit debug configuration
    if (import.meta.env.DEV) {
      return 'http://10.0.2.2:8000/api/v1';
    }
    // Native Android release builds must NOT use Capacitor WebView origin as an API fallback
    // and must return an explicit unconfigured state ("") if no real backend URL is available.
    return '';
  }

  // 4. Web browser environment (ONLY when NOT running on native Android/Capacitor)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    const isLocalWeb = hostname === 'localhost' || hostname === '127.0.0.1';

    // Development web mode (strictly tree-shaken and excluded from release builds)
    if (import.meta.env.DEV && isLocalWeb) {
      return 'http://localhost:8000/api/v1';
    }

    // Web builds in production may use a legitimate same-origin API endpoint if that deployment architecture supports it
    if (
      origin &&
      !origin.includes('capacitor://') &&
      !origin.includes('http://localhost') &&
      !origin.startsWith('file:') &&
      !isLocalWeb
    ) {
      return `${origin}/api/v1`;
    }
  }

  // 5. Explicit unconfigured state
  return '';
};

/**
 * Derives WebSocket base URL dynamically from API Base URL:
 * - HTTPS converts to WSS.
 * - HTTP converts to WS ONLY in permitted development configurations.
 * - Returns empty string if backend is not configured.
 */
export const getWsBaseUrl = (): string => {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    return '';
  }
  const rootUrl = apiBase.replace(/\/api\/v1\/?$/, '');
  if (rootUrl.startsWith('https://')) {
    return rootUrl.replace(/^https:\/\//i, 'wss://');
  }
  if (import.meta.env.DEV && rootUrl.startsWith('http://')) {
    return rootUrl.replace(/^http:\/\//i, 'ws://');
  }
  return '';
};

export const checkServerConnection = async (testUrl?: string): Promise<{ ok: boolean; status?: string; message?: string }> => {
  let targetUrl = testUrl ? testUrl.trim() : getApiBaseUrl();
  if (!targetUrl) {
    return { ok: false, message: 'Backend URL is not configured. Please enter a valid HTTPS URL.' };
  }

  const validation = validateApiUrl(targetUrl);
  if (!validation.valid || !validation.normalized) {
    return { ok: false, message: validation.error || 'Invalid server URL format.' };
  }
  targetUrl = validation.normalized;

  const rootUrl = targetUrl.replace(/\/api\/v1\/?$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${rootUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, status: data.status || 'healthy' };
    }
    return { ok: false, message: `Server returned HTTP ${res.status} (${res.statusText})` };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { ok: false, message: 'Connection timed out (6s). Check internet connection or server status.' };
    }
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.name === 'TypeError')) {
      if (import.meta.env.PROD && targetUrl.startsWith('http://')) {
        return { ok: false, message: 'Android release builds block cleartext HTTP. You must use HTTPS.' };
      }
      return { ok: false, message: `Cannot reach server at ${targetUrl}. Ensure host is online and SSL certificate is valid.` };
    }
    return {
      ok: false,
      message: err.message || 'Cannot reach server'
    };
  }
};

class ApiClient {
  private getHeaders(contentType = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const token = localStorage.getItem('paaaaaatify_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      throw new Error(
        'Backend server URL is not configured. Please tap "Server Connection" in Settings or the login screen to configure your production HTTPS backend.'
      );
    }

    if (import.meta.env.PROD && /localhost|10\.0\.2\.2|127\.0\.0\.1/.test(baseUrl)) {
      throw new Error(
        'Production release builds cannot target localhost or emulator loopback addresses. Please configure a valid HTTPS backend URL.'
      );
    }

    const url = `${baseUrl}${endpoint}`;
    const headers = {
      ...this.getHeaders(options.body instanceof FormData ? '' : 'application/json'),
      ...options.headers,
    };

    if (options.body instanceof FormData) {
      delete (headers as any)['Content-Type'];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 401) {
        // Clear token if invalid
        localStorage.removeItem('paaaaaatify_access_token');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      return response.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request to ${url} timed out (12s). Check your internet connection or backend server status.`);
      }
      if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.name === 'TypeError')) {
        throw new Error(`Unable to connect to backend at ${baseUrl}. Ensure the server is online and reachable.`);
      }
      throw err;
    }
  }

  // Auth
  auth = {
    login: (credentials: any) => this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    register: (data: any) => this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    google: (credential: string) => this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    }),
    me: () => this.request<User>('/auth/me'),
    logout: () => this.request<{ message: string }>('/auth/logout', { method: 'POST' }),
  };

  // Songs
  songs = {
    getAll: (params?: { genre?: string; search?: string; trending?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.genre) query.append('genre', params.genre);
      if (params?.search) query.append('search', params.search);
      if (params?.trending !== undefined) query.append('trending', String(params.trending));
      return this.request<Song[]>(`/songs?${query.toString()}`);
    },
    getById: (id: string) => this.request<Song>(`/songs/${id}`),
    recordPlay: (id: string, duration = 0) => this.request<{ status: string; play_count: number }>(`/songs/${id}/play?duration_played=${duration}`, { method: 'POST' }),
    getGenres: () => this.request<Genre[]>('/songs/genres'),
  };

  // Playlists
  playlists = {
    getAll: () => this.request<Playlist[]>('/playlists'),
    getById: (id: string) => this.request<Playlist>(`/playlists/${id}`),
    create: (data: { title: string; description?: string; cover_art_url?: string; is_public?: boolean }) =>
      this.request<Playlist>('/playlists', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      this.request<Playlist>(`/playlists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => this.request<{ status: string }>(`/playlists/${id}`, { method: 'DELETE' }),
    addSong: (playlistId: string, songId: string) =>
      this.request<{ status: string }>(`/playlists/${playlistId}/songs`, { method: 'POST', body: JSON.stringify({ song_id: songId }) }),
    removeSong: (playlistId: string, songId: string) =>
      this.request<{ status: string }>(`/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' }),
  };

  // Favorites
  favorites = {
    getAll: () => this.request<Song[]>('/favorites'),
    toggle: (songId: string) => this.request<{ status: string; is_favorite: boolean }>(`/favorites/${songId}/toggle`, { method: 'POST' }),
  };

  // Group Rooms
  rooms = {
    create: (data: { name?: string; is_private?: boolean; initial_song_id?: string }) =>
      this.request<Room>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
    join: (code: string) =>
      this.request<Room>('/rooms/join', { method: 'POST', body: JSON.stringify({ code }) }),
    getById: (id: string) => this.request<Room>(`/rooms/${id}`),
    leave: (id: string) => this.request<{ status: string }>(`/rooms/${id}/leave`, { method: 'POST' }),
    play: (id: string, position_ms?: number) =>
      this.request<any>(`/rooms/${id}/play`, { method: 'POST', body: JSON.stringify({ action: 'PLAY', position_ms }) }),
    pause: (id: string, position_ms?: number) =>
      this.request<any>(`/rooms/${id}/pause`, { method: 'POST', body: JSON.stringify({ action: 'PAUSE', position_ms }) }),
    seek: (id: string, position_ms: number) =>
      this.request<any>(`/rooms/${id}/seek`, { method: 'POST', body: JSON.stringify({ action: 'SEEK', position_ms }) }),
    next: (id: string, songId?: string) =>
      this.request<any>(`/rooms/${id}/next`, { method: 'POST', body: JSON.stringify({ action: 'NEXT', song_id: songId }) }),
    addToQueue: (id: string, songId: string) =>
      this.request<{ status: string }>(`/rooms/${id}/queue?song_id=${songId}`, { method: 'POST' }),
  };

  // Recommendations
  recommendations = {
    getMadeForYou: () => this.request<Song[]>('/recommendations/made-for-you'),
    getTrending: () => this.request<Song[]>('/recommendations/trending'),
    getRecentlyPlayed: () => this.request<Song[]>('/recommendations/recently-played'),
    getPopularArtists: () => this.request<Artist[]>('/recommendations/popular-artists'),
    getDailyMix: () => this.request<Song[]>('/recommendations/daily-mix'),
  };

  // User & Settings
  users = {
    getProfile: () => this.request<User>('/users/me'),
    updateProfile: (data: any) => this.request<User>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
    getStats: () => this.request<UserStats>('/users/me/stats'),
    getSettings: () => this.request<UserSettings>('/users/me/settings'),
    updateSettings: (data: any) => this.request<UserSettings>('/users/me/settings', { method: 'PUT', body: JSON.stringify(data) }),
    deleteAccount: () => this.request<{ status: string; message: string }>('/users/me', { method: 'DELETE' }),
  };

  // Uploads
  uploads = {
    uploadAudio: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return this.request<Song>('/uploads/audio', { method: 'POST', body: formData });
    },
  };

  // Admin Subsystem
  admin = {
    getHealth: () => this.request<any>('/admin/health'),
    getUsers: () => this.request<any[]>('/admin/users'),
    updateUserStatus: (userId: string, data: { is_active?: boolean; is_admin?: boolean }) =>
      this.request<any>(`/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    getRooms: () => this.request<any[]>('/admin/rooms'),
    getProviders: () => this.request<any[]>('/admin/providers'),
    toggleProvider: (id: string, is_enabled: boolean) =>
      this.request<any>(`/admin/providers/${id}/toggle`, { method: 'POST', body: JSON.stringify({ is_enabled }) }),
    getLogs: () => this.request<any[]>('/admin/logs'),
  };
}

export const api = new ApiClient();
