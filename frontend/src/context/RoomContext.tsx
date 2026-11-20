import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, RoomParticipant, RoomQueueItem, Song } from '../types';
import { api } from '../services/api';
import { roomWs } from '../services/ws';
import { useAudioPlayer } from './AudioPlayerContext';
import { useAuth } from './AuthContext';

interface RoomContextType {
  room: Room | null;
  isInRoom: boolean;
  isHost: boolean;
  participants: RoomParticipant[];
  roomQueue: RoomQueueItem[];
  connectionStatus: string;
  createRoom: (name?: string, initialSongId?: string) => Promise<Room>;
  joinRoom: (code: string) => Promise<Room>;
  leaveRoom: () => Promise<void>;
  hostPlay: (positionMs?: number) => Promise<void>;
  hostPause: (positionMs?: number) => Promise<void>;
  hostSeek: (positionMs: number) => Promise<void>;
  hostNext: (songId?: string) => Promise<void>;
  addSongToRoomQueue: (songId: string) => Promise<void>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [roomQueue, setRoomQueue] = useState<RoomQueueItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('DISCONNECTED');

  const { playSong, pause, resume, syncWithServerPosition, getPlaybackPositionMs, currentSong } = useAudioPlayer();
  const { user } = useAuth();

  const isHost = room?.host_id === user?.id;

  useEffect(() => {
    if (!room) return;

    const token = localStorage.getItem('paaaaaatify_access_token') || '';
    roomWs.connect(room.id, token, getPlaybackPositionMs);
    setConnectionStatus('CONNECTING');

    const unsubscribe = roomWs.subscribe((event) => {
      if (event.type === 'WS_CONNECTED') {
        setConnectionStatus('SYNCHRONIZED');
        if (event.reconnected) {
          api.rooms.getById(room.id).then((freshRoom) => {
            setRoom(freshRoom);
            setParticipants(freshRoom.participants);
            setRoomQueue(freshRoom.queue);
            if (freshRoom.current_song) {
              if (!currentSong || currentSong.id !== freshRoom.current_song.id) {
                playSong(freshRoom.current_song);
              }
              if (freshRoom.playback_state === 'PLAYING') {
                syncWithServerPosition(freshRoom.current_position_ms);
              } else {
                pause();
                syncWithServerPosition(freshRoom.current_position_ms);
              }
            }
          }).catch((err) => {
            console.warn('Failed to resync room state after reconnect', err);
          });
        }
      } else if (event.type === 'WS_DISCONNECTED') {
        setConnectionStatus('RECONNECTING');
      } else if (event.type === 'PLAYBACK_SYNC') {
        handlePlaybackSync(event);
      } else if (event.type === 'DRIFT_CORRECTION') {
        syncWithServerPosition(event.expected_position_ms);
      } else if (event.type === 'USER_JOINED') {
        setParticipants((prev) => {
          if (prev.some((p) => p.user_id === event.user.id)) return prev;
          return [
            ...prev,
            {
              id: event.user.id,
              user_id: event.user.id,
              username: event.user.username,
              display_name: event.user.display_name,
              avatar_url: event.user.avatar_url,
              is_host: event.user.is_host,
              is_ready: true,
              drift_ms: 0,
              connection_status: 'SYNCHRONIZED',
            },
          ];
        });
      } else if (event.type === 'USER_LEFT') {
        setParticipants((prev) => prev.filter((p) => p.user_id !== event.user_id));
      } else if (event.type === 'QUEUE_UPDATED') {
        setRoomQueue((prev) => [...prev, event.queue_item]);
      }
    });

    return () => {
      unsubscribe();
      roomWs.disconnect();
    };
  }, [room?.id]);

  const handlePlaybackSync = (event: any) => {
    setConnectionStatus('SYNCHRONIZED');
    if (event.song && (!currentSong || currentSong.id !== event.song.id)) {
      playSong(event.song);
    }

    if (event.playback_state === 'PAUSED') {
      pause();
      syncWithServerPosition(event.current_position_ms);
    } else if (event.playback_state === 'PLAYING') {
      syncWithServerPosition(event.current_position_ms, event.scheduled_start_time);
    }

    setRoom((prev) => (prev ? { ...prev, playback_state: event.playback_state, current_position_ms: event.current_position_ms } : null));
  };

  const createRoom = async (name?: string, initialSongId?: string): Promise<Room> => {
    const newRoom = await api.rooms.create({ name, initial_song_id: initialSongId });
    setRoom(newRoom);
    setParticipants(newRoom.participants);
    setRoomQueue(newRoom.queue);
    return newRoom;
  };

  const joinRoom = async (code: string): Promise<Room> => {
    const joined = await api.rooms.join(code);
    setRoom(joined);
    setParticipants(joined.participants);
    setRoomQueue(joined.queue);
    if (joined.current_song) {
      playSong(joined.current_song);
      if (joined.playback_state === 'PLAYING') {
        syncWithServerPosition(joined.current_position_ms);
      } else {
        pause();
      }
    }
    return joined;
  };

  const leaveRoom = async () => {
    if (room) {
      await api.rooms.leave(room.id).catch(() => {});
      roomWs.disconnect();
      setRoom(null);
      setParticipants([]);
      setRoomQueue([]);
      setConnectionStatus('DISCONNECTED');
    }
  };

  const hostPlay = async (positionMs?: number) => {
    if (!room) return;
    await api.rooms.play(room.id, positionMs);
  };

  const hostPause = async (positionMs?: number) => {
    if (!room) return;
    await api.rooms.pause(room.id, positionMs);
  };

  const hostSeek = async (positionMs: number) => {
    if (!room) return;
    await api.rooms.seek(room.id, positionMs);
  };

  const hostNext = async (songId?: string) => {
    if (!room) return;
    await api.rooms.next(room.id, songId);
  };

  const addSongToRoomQueue = async (songId: string) => {
    if (!room) return;
    await api.rooms.addToQueue(room.id, songId);
  };

  return (
    <RoomContext.Provider
      value={{
        room,
        isInRoom: !!room,
        isHost,
        participants,
        roomQueue,
        connectionStatus,
        createRoom,
        joinRoom,
        leaveRoom,
        hostPlay,
        hostPause,
        hostSeek,
        hostNext,
        addSongToRoomQueue,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRoom must be used within a RoomProvider');
  return context;
};

