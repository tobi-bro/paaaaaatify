import random
import string
import time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Room, RoomParticipant, RoomQueueItem, Song, User
from app.schemas.schemas import (
    RoomCreate, RoomJoin, RoomOut, RoomParticipantOut, RoomQueueItemOut, PlaybackCommand, DriftReport, SongOut, UserOut
)
from app.api.deps import get_current_user
from app.api.songs import song_to_out
from app.services.sync_engine import sync_engine

router = APIRouter(prefix="/rooms", tags=["Group Listening Rooms"])

def generate_room_code() -> str:
    # Generates human-friendly code matching design: e.g. PAAAA-8427
    digits = "".join(random.choices(string.digits, k=4))
    return f"PAAAA-{digits}"

def room_to_out(room: Room, current_user_id: str, db: Session) -> RoomOut:
    participants_out = []
    for p in room.participants:
        participants_out.append(RoomParticipantOut(
            id=p.id,
            user_id=p.user_id,
            username=p.user.username if p.user else "User",
            display_name=p.user.display_name if p.user else None,
            avatar_url=p.user.avatar_url if p.user else None,
            is_host=(p.user_id == room.host_id),
            is_ready=p.is_ready,
            drift_ms=p.drift_ms,
            connection_status=p.connection_status
        ))

    queue_out = []
    for q in room.queue_items:
        if q.song and q.added_by_user:
            queue_out.append(RoomQueueItemOut(
                id=q.id,
                song=song_to_out(q.song),
                added_by=UserOut.model_validate(q.added_by_user),
                order_index=q.order_index
            ))

    # Calculate real-time authoritative position
    current_pos_ms = sync_engine.compute_current_playback_position(room)

    return RoomOut(
        id=room.id,
        code=room.code,
        name=room.name,
        host_id=room.host_id,
        host_username=room.host.username if room.host else "Host",
        current_song=song_to_out(room.current_song) if room.current_song else None,
        playback_state=room.playback_state,
        current_position_ms=current_pos_ms,
        server_timestamp=time.time(),
        sequence_num=room.sequence_num,
        participants_count=len(room.participants),
        participants=participants_out,
        queue=queue_out,
        is_host=(room.host_id == current_user_id)
    )

@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    room_in: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure unique code
    code = generate_room_code()
    while db.query(Room).filter(Room.code == code).first():
        code = generate_room_code()

    # If initial song not provided, pick first available trending song
    song_id = room_in.initial_song_id
    if not song_id:
        first_song = db.query(Song).filter(Song.is_active == True).first()
        if first_song:
            song_id = first_song.id

    room = Room(
        code=code,
        name=room_in.name or f"{current_user.display_name or current_user.username}'s Room",
        host_id=current_user.id,
        current_song_id=song_id,
        playback_state="PAUSED",
        current_position_ms=0,
        server_timestamp=time.time(),
        sequence_num=1,
        is_private=room_in.is_private
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    # Add host as first participant
    participant = RoomParticipant(
        room_id=room.id,
        user_id=current_user.id,
        is_ready=True,
        connection_status="SYNCHRONIZED"
    )
    db.add(participant)
    db.commit()
    db.refresh(room)

    return room_to_out(room, current_user.id, db)

@router.post("/join", response_model=RoomOut)
async def join_room(
    join_in: RoomJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    code = join_in.code.strip().upper()
    room = db.query(Room).filter(Room.code == code, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Invalid room code or session expired")

    # Check participant limit
    if len(room.participants) >= room.max_participants:
        raise HTTPException(status_code=400, detail="Room is currently full")

    # Check if user already participant
    existing_p = db.query(RoomParticipant).filter(
        RoomParticipant.room_id == room.id,
        RoomParticipant.user_id == current_user.id
    ).first()

    if not existing_p:
        new_p = RoomParticipant(
            room_id=room.id,
            user_id=current_user.id,
            is_ready=True,
            connection_status="SYNCHRONIZED"
        )
        db.add(new_p)
        db.commit()
        db.refresh(room)

        # Notify active room members via sync engine
        await sync_engine.broadcast_to_room(room.id, {
            "type": "USER_JOINED",
            "user": {
                "id": current_user.id,
                "username": current_user.username,
                "display_name": current_user.display_name,
                "avatar_url": current_user.avatar_url,
                "is_host": False
            },
            "participants_count": len(room.participants)
        })

    return room_to_out(room, current_user.id, db)

@router.get("/{room_id}", response_model=RoomOut)
def get_room_details(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return room_to_out(room, current_user.id, db)

@router.post("/{room_id}/leave")
async def leave_room(
    room_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    participant = db.query(RoomParticipant).filter(
        RoomParticipant.room_id == room.id,
        RoomParticipant.user_id == current_user.id
    ).first()

    if participant:
        db.delete(participant)
        db.commit()

    # If host left, transfer host or deactivate
    remaining = db.query(RoomParticipant).filter(RoomParticipant.room_id == room.id).all()
    if not remaining:
        room.is_active = False
        db.commit()
    elif room.host_id == current_user.id:
        room.host_id = remaining[0].user_id
        db.commit()
        await sync_engine.broadcast_to_room(room.id, {
            "type": "HOST_CHANGED",
            "new_host_id": room.host_id
        })

    await sync_engine.broadcast_to_room(room.id, {
        "type": "USER_LEFT",
        "user_id": current_user.id,
        "participants_count": len(remaining)
    })

    return {"status": "ok", "message": "Left room"}

@router.post("/{room_id}/play")
async def room_play(
    room_id: str,
    cmd: Optional[PlaybackCommand] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pos = cmd.position_ms if cmd else None
    res = await sync_engine.execute_playback_command(db, room_id, current_user.id, "PLAY", position_ms=pos)
    if "error" in res:
        raise HTTPException(status_code=403, detail=res["error"])
    return res

@router.post("/{room_id}/pause")
async def room_pause(
    room_id: str,
    cmd: Optional[PlaybackCommand] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pos = cmd.position_ms if cmd else None
    res = await sync_engine.execute_playback_command(db, room_id, current_user.id, "PAUSE", position_ms=pos)
    if "error" in res:
        raise HTTPException(status_code=403, detail=res["error"])
    return res

@router.post("/{room_id}/seek")
async def room_seek(
    room_id: str,
    cmd: PlaybackCommand,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    res = await sync_engine.execute_playback_command(db, room_id, current_user.id, "SEEK", position_ms=cmd.position_ms)
    if "error" in res:
        raise HTTPException(status_code=403, detail=res["error"])
    return res

@router.post("/{room_id}/next")
async def room_next(
    room_id: str,
    cmd: Optional[PlaybackCommand] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    song_id = cmd.song_id if cmd else None
    res = await sync_engine.execute_playback_command(db, room_id, current_user.id, "NEXT", song_id=song_id)
    if "error" in res:
        raise HTTPException(status_code=403, detail=res["error"])
    return res

@router.post("/{room_id}/queue")
async def add_to_room_queue(
    room_id: str,
    song_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    room = db.query(Room).filter(Room.id == room_id, Room.is_active == True).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    song = db.query(Song).filter(Song.id == song_id).first()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    order_idx = len(room.queue_items)
    item = RoomQueueItem(
        room_id=room.id,
        song_id=song.id,
        added_by_user_id=current_user.id,
        order_index=order_idx
    )
    db.add(item)
    db.commit()

    # Broadcast queue update
    await sync_engine.broadcast_to_room(room.id, {
        "type": "QUEUE_UPDATED",
        "queue_item": {
            "id": item.id,
            "song": song_to_out(song).model_dump(),
            "added_by": UserOut.model_validate(current_user).model_dump(),
            "order_index": item.order_index
        }
    })

    return {"status": "ok", "message": "Song added to room queue"}

