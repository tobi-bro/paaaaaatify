import time
import json
import asyncio
from typing import Dict, Set, List, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.models.models import Room, RoomParticipant, Song, User, PlaybackEvent, RoomQueueItem
from app.core.database import SessionLocal

class SyncEngine:
    def __init__(self):
        # Mapping room_id -> Dict[user_id, WebSocket]
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # Mapping room_id -> lock
        self.room_locks: Dict[str, asyncio.Lock] = {}

    def get_room_lock(self, room_id: str) -> asyncio.Lock:
        if room_id not in self.room_locks:
            self.room_locks[room_id] = asyncio.Lock()
        return self.room_locks[room_id]

    async def connect(self, room_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][user_id] = websocket

    async def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].pop(user_id, None)
            if not self.active_connections[room_id]:
                self.active_connections.pop(room_id, None)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_user_id: Optional[str] = None):
        if room_id not in self.active_connections:
            return
        
        dead_connections = []
        payload = json.dumps(message)
        
        for uid, ws in list(self.active_connections[room_id].items()):
            if exclude_user_id and uid == exclude_user_id:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead_connections.append(uid)
                
        for uid in dead_connections:
            await self.disconnect(room_id, uid)

    def compute_current_playback_position(self, room: Room) -> int:
        """
        Calculates the exact server-authoritative playback position right now in milliseconds.
        If PLAYING: current_position_ms + (now - server_timestamp) * 1000
        If PAUSED: current_position_ms
        """
        if room.playback_state != "PLAYING":
            return room.current_position_ms
        
        now = time.time()
        elapsed_seconds = max(0.0, now - room.server_timestamp)
        calculated_ms = int(room.current_position_ms + (elapsed_seconds * 1000))
        
        # Cap at song duration if known
        if room.current_song and room.current_song.duration_seconds:
            max_ms = room.current_song.duration_seconds * 1000
            if calculated_ms > max_ms:
                calculated_ms = max_ms
                
        return calculated_ms

    async def handle_ping(self, websocket: WebSocket, client_time: float):
        """
        NTP-style clock sync ping-pong.
        Client sends its timestamp t0.
        Server records receive time t1, responds with t1 and server send time t2.
        Client receives at t3, calculating skew theta = ((t1 - t0) + (t2 - t3)) / 2 and RTT = (t3 - t0) - (t2 - t1).
        """
        server_now = time.time()
        await websocket.send_text(json.dumps({
            "type": "PONG",
            "client_timestamp": client_time,
            "server_timestamp": server_now
        }))

    async def execute_playback_command(
        self,
        db: Session,
        room_id: str,
        user_id: str,
        action: str,
        position_ms: Optional[int] = None,
        song_id: Optional[str] = None
    ) -> dict:
        lock = self.get_room_lock(room_id)
        async with lock:
            room = db.query(Room).filter(Room.id == room_id).first()
            if not room:
                return {"error": "Room not found"}
            
            # Verify host permission
            if room.host_id != user_id:
                return {"error": "Only the host can control playback"}

            server_now = time.time()
            scheduled_start_delay = 0.25  # 250ms lead-time buffer for multi-device sync
            scheduled_time = server_now + scheduled_start_delay

            room.sequence_num += 1

            if action == "PLAY":
                # If position specified, seek to it first
                if position_ms is not None:
                    room.current_position_ms = max(0, position_ms)
                room.playback_state = "PLAYING"
                room.server_timestamp = scheduled_time
                
            elif action == "PAUSE":
                curr_pos = self.compute_current_playback_position(room)
                if position_ms is not None:
                    curr_pos = position_ms
                room.current_position_ms = curr_pos
                room.playback_state = "PAUSED"
                room.server_timestamp = server_now

            elif action == "SEEK":
                target_pos = position_ms if position_ms is not None else 0
                room.current_position_ms = max(0, target_pos)
                if room.playback_state == "PLAYING":
                    room.server_timestamp = scheduled_time
                else:
                    room.server_timestamp = server_now

            elif action == "NEXT" or action == "PREV":
                # Pick next from queue or related song
                if song_id:
                    room.current_song_id = song_id
                else:
                    # check room queue
                    next_queue_item = db.query(RoomQueueItem).filter(
                        RoomQueueItem.room_id == room_id
                    ).order_by(RoomQueueItem.order_index).first()
                    
                    if next_queue_item:
                        room.current_song_id = next_queue_item.song_id
                        db.delete(next_queue_item)
                        db.commit()
                
                room.current_position_ms = 0
                room.playback_state = "PLAYING"
                room.server_timestamp = scheduled_time

            elif action == "CHANGE_TRACK" and song_id:
                room.current_song_id = song_id
                room.current_position_ms = 0
                room.playback_state = "PLAYING"
                room.server_timestamp = scheduled_time

            # Log playback event for audit and recovery
            event = PlaybackEvent(
                room_id=room.id,
                event_type=action,
                song_id=room.current_song_id,
                position_ms=room.current_position_ms,
                server_timestamp=room.server_timestamp,
                sequence_num=room.sequence_num,
                triggered_by_user_id=user_id
            )
            db.add(event)
            db.commit()
            db.refresh(room)

            # Build broadcast payload
            song_data = None
            if room.current_song:
                song_data = {
                    "id": room.current_song.id,
                    "title": room.current_song.title,
                    "artist_name": room.current_song.artist.name if room.current_song.artist else "Unknown Artist",
                    "album_title": room.current_song.album.title if room.current_song.album else "",
                    "audio_url": room.current_song.audio_url,
                    "artwork_url": room.current_song.artwork_url,
                    "duration_seconds": room.current_song.duration_seconds,
                    "lyrics": room.current_song.lyrics
                }

            broadcast_event = {
                "type": "PLAYBACK_SYNC",
                "action": action,
                "room_id": room.id,
                "song": song_data,
                "playback_state": room.playback_state,
                "current_position_ms": room.current_position_ms,
                "server_timestamp": room.server_timestamp,
                "scheduled_start_time": scheduled_time if room.playback_state == "PLAYING" else None,
                "sequence_num": room.sequence_num
            }

            await self.broadcast_to_room(room.id, broadcast_event)
            return broadcast_event

    async def handle_drift_report(
        self,
        db: Session,
        room_id: str,
        user_id: str,
        client_position_ms: int,
        client_timestamp: float
    ):
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            return

        expected_position_ms = self.compute_current_playback_position(room)
        drift_ms = client_position_ms - expected_position_ms

        participant = db.query(RoomParticipant).filter(
            RoomParticipant.room_id == room_id,
            RoomParticipant.user_id == user_id
        ).first()

        if participant:
            participant.drift_ms = float(drift_ms)
            if abs(drift_ms) > 300:
                participant.connection_status = "BUFFERING"
            else:
                participant.connection_status = "SYNCHRONIZED"
            db.commit()

        # If client drift is significant (> 120ms), send directed correction to that client
        if abs(drift_ms) > 120 and room_id in self.active_connections:
            ws = self.active_connections[room_id].get(user_id)
            if ws:
                await ws.send_text(json.dumps({
                    "type": "DRIFT_CORRECTION",
                    "expected_position_ms": expected_position_ms,
                    "drift_ms": drift_ms,
                    "playback_state": room.playback_state,
                    "server_timestamp": time.time(),
                    "sequence_num": room.sequence_num
                }))

sync_engine = SyncEngine()
