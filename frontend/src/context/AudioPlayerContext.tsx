import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Song } from '../types';
import { api, getApiBaseUrl } from '../services/api';

export const resolveMediaUrl = (url: string | undefined | null): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return url;
  }
  const origin = baseUrl.replace(/\/api\/v1\/?$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${cleanPath}`;
};

interface AudioPlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  queue: Song[];
  queueIndex: number;
  isFullScreenOpen: boolean;
  isLyricsOpen: boolean;
  playSong: (song: Song, newQueue?: Song[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  addToQueue: (song: Song) => void;
  setFullScreenOpen: (open: boolean) => void;
  setLyricsOpen: (open: boolean) => void;
  syncWithServerPosition: (positionMs: number, scheduledStartTime?: number | null) => void;
  getPlaybackPositionMs: () => number;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [isFullScreenOpen, setFullScreenOpen] = useState<boolean>(false);
  const [isLyricsOpen, setLyricsOpen] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scheduledTimerRef = useRef<any>(null);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && audio.duration && !isNaN(audio.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(audio.currentTime, audio.duration),
          });
        } catch {
          // ignore transient audio element state
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || currentSong?.duration_seconds || 0);
    };

    const handleEnded = () => {
      if (isRepeat) {
        audio.currentTime = 0;
        audio.play().catch(() => { });
      } else {
        handleNext();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
    };
  }, [isRepeat]);

  // Android MediaSession API integration for lock-screen & notification controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist_name || 'Paaaaaaatify Artist',
        album: currentSong.album_title || 'Paaaaaaatify Original',
        artwork: [
          { src: resolveMediaUrl(currentSong.artwork_url) || '/logo.svg', sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      });
    }
  }, [currentSong]);

  const playSong = (song: Song, newQueue?: Song[]) => {
    if (!audioRef.current) return;
    setCurrentSong(song);

    if (newQueue) {
      setQueue(newQueue);
      const idx = newQueue.findIndex((s) => s.id === song.id);
      setQueueIndex(idx !== -1 ? idx : 0);
    } else if (queue.length === 0) {
      setQueue([song]);
      setQueueIndex(0);
    }

    const resolvedUrl = resolveMediaUrl(song.audio_url);
    audioRef.current.src = resolvedUrl;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => {
      setIsPlaying(true);
      api.songs.recordPlay(song.id).catch(() => { });
    }).catch((err) => {
      console.warn('Playback error or user gesture required', err);
    });
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => { });
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const resume = () => {
    if (audioRef.current && currentSong) {
      audioRef.current.play().catch(() => { });
    }
  };

  const seek = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(seconds, audioRef.current.duration || 9999));
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    let nextIdx: number;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = (queueIndex + 1) % queue.length;
    }
    setQueueIndex(nextIdx);
    playSong(queue[nextIdx]);
  };

  const nextTrack = () => handleNext();

  const prevTrack = () => {
    if (!audioRef.current || queue.length === 0) return;
    if (audioRef.current.currentTime > 3) {
      seek(0);
      return;
    }
    const prevIdx = queueIndex === 0 ? queue.length - 1 : queueIndex - 1;
    setQueueIndex(prevIdx);
    playSong(queue[prevIdx]);
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);
  const toggleRepeat = () => setIsRepeat(!isRepeat);

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : vol;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.volume = !isMuted ? 0 : volume;
    }
  };

  const addToQueue = (song: Song) => {
    setQueue((prev) => [...prev, song]);
  };

  const getPlaybackPositionMs = (): number => {
    if (!audioRef.current) return 0;
    return audioRef.current.currentTime * 1000;
  };

  // Real-time server sync handler with drift correction
  const syncWithServerPosition = (positionMs: number, scheduledStartTime?: number | null) => {
    if (!audioRef.current) return;
    const targetSeconds = positionMs / 1000;

    if (scheduledStartTime) {
      const now = Date.now() / 1000;
      const delayMs = Math.max(0, (scheduledStartTime - now) * 1000);

      if (scheduledTimerRef.current) clearTimeout(scheduledTimerRef.current);

      scheduledTimerRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = targetSeconds;
          audioRef.current.play().catch(() => { });
        }
      }, delayMs);
    } else {
      // Calculate instantaneous drift
      const currentPos = audioRef.current.currentTime;
      const drift = Math.abs(currentPos - targetSeconds);

      if (drift > 0.15) { // If drift exceeds 150ms, hard seek
        audioRef.current.currentTime = targetSeconds;
      } else if (drift > 0.05) { // Micro drift: adjust playback rate smoothly
        audioRef.current.playbackRate = currentPos < targetSeconds ? 1.03 : 0.97;
        setTimeout(() => {
          if (audioRef.current) audioRef.current.playbackRate = 1.0;
        }, 1000);
      }
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration: duration || currentSong?.duration_seconds || 212,
        volume,
        isMuted,
        isShuffle,
        isRepeat,
        queue,
        queueIndex,
        isFullScreenOpen,
        isLyricsOpen,
        playSong,
        togglePlay,
        pause,
        resume,
        seek,
        nextTrack,
        prevTrack,
        toggleShuffle,
        toggleRepeat,
        setVolume,
        toggleMute,
        addToQueue,
        setFullScreenOpen,
        setLyricsOpen,
        syncWithServerPosition,
        getPlaybackPositionMs,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  return context;
};

