import React, { useState } from 'react';
import {
  Users, Copy, Share2, Crown, Play, Pause, LogOut, Check, Plus, Radio, ArrowLeft
} from 'lucide-react';
import { useRoom } from '../context/RoomContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useAuth } from '../context/AuthContext';

interface RoomPageProps {
  onBack?: () => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({ onBack }) => {
  const {
    room,
    isInRoom,
    isHost,
    participants,
    connectionStatus,
    createRoom,
    joinRoom,
    leaveRoom,
    hostPlay,
    hostPause,
  } = useRoom();

  const { currentSong, isPlaying } = useAudioPlayer();
  const { user } = useAuth();

  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCopyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      await createRoom('Cyberpunk Sync Hub', currentSong?.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await joinRoom(inputCode.trim());
    } catch (err: any) {
      setError(err.message || 'Invalid room code');
    } finally {
      setLoading(false);
    }
  };

  // If user is not yet in a room: Show Join or Create view
  if (!isInRoom || !room) {
    return (
      <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-md mx-auto p-6">
        <div className="pt-8 mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-[#1ED760]" />
            <span>Group Listening</span>
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Listen in real-time with friends anywhere in the world. 100% Free.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4 my-auto">
          {/* Join Room Form */}
          <div className="bg-[#12141B] border border-[#1B1E28] rounded-3xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-2">Join a Room</h3>
            <p className="text-xs text-[#A1A1AA] mb-4">Enter a 9-character code like PAAAA-8427</p>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="PAAAA-8427"
                maxLength={10}
                className="w-full bg-[#1B1E28] border border-[#242836] rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-[#1ED760] placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#1ED760] hover:bg-[#1bc456] text-black font-bold rounded-full transition-all active:scale-[0.98]"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-[#71717A] font-semibold uppercase tracking-wider">or</div>

          {/* Create Room Button */}
          <div className="bg-[#12141B] border border-[#1B1E28] rounded-3xl p-5 shadow-xl text-center">
            <h3 className="text-sm font-bold text-white mb-1">Start a New Session</h3>
            <p className="text-xs text-[#A1A1AA] mb-4">You will be the host and control playback.</p>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full h-11 bg-[#8B5CF6] hover:bg-[#7c3aed] text-white font-bold rounded-full transition-all active:scale-[0.98] shadow-lg shadow-purple-600/30"
            >
              {loading ? 'Creating...' : 'Create Room 🚀'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Group Listening Room Screen matching Screen 5 strictly
  return (
    <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-md mx-auto overflow-x-hidden">
      {/* Top Bar */}
      <div className="flex items-center space-x-3 px-6 pt-12 pb-3">
        {onBack && (
          <button onClick={onBack} className="p-2 text-[#A1A1AA] hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-lg font-bold text-white">Group Listening</h2>
      </div>

      {/* Hero Card matching Screen 5 */}
      <div className="px-6 pt-1">
        <div className="relative rounded-3xl overflow-hidden p-6 bg-gradient-to-br from-purple-900/70 via-indigo-950 to-black border border-purple-500/30 shadow-2xl flex flex-col items-center text-center">
          {/* Overlapping Participant Avatars */}
          <div className="flex items-center -space-x-3 mb-4">
            {participants.slice(0, 4).map((p, idx) => (
              <div
                key={p.id}
                className="w-12 h-12 rounded-full border-2 border-[#12141B] overflow-hidden shadow-lg"
              >
                <img
                  src={p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                  alt={p.username}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-[#A1A1AA] font-semibold uppercase tracking-wider">Room Code</p>

          {/* Large Glowing Green Room Code */}
          <div className="flex items-center space-x-2 my-1">
            <span className="text-2xl font-black font-mono tracking-widest text-[#1ED760] drop-shadow-[0_0_12px_#1ED760]">
              {room.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#1ED760] transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-[#1ED760]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-gray-300 font-medium mt-1">
            {participants.length} members • Host: {room.host_username || 'Tobi'}
          </p>

          {/* Sync Status Badge */}
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-[#1ED760] mt-3">
            <span className="w-2 h-2 rounded-full bg-[#1ED760] animate-pulse" />
            <span>{connectionStatus} (Server Clock Drift: &lt;15ms)</span>
          </div>

          {/* Invite Friends Button matching Screen 5 */}
          <button
            onClick={handleCopyCode}
            className="w-full mt-4 h-11 bg-[#1ED760] hover:bg-[#1bc456] text-black font-bold rounded-full flex items-center justify-center space-x-2 shadow-lg shadow-[#1ED760]/30 active:scale-95 transition-transform"
          >
            <span>{copied ? 'Copied Link!' : 'Invite Friends 🚀'}</span>
          </button>
        </div>
      </div>

      {/* Now Playing Mini Card matching Screen 5 */}
      <div className="px-6 pt-5">
        <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Now Playing</h4>
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#12141B] border border-[#1B1E28] shadow-lg">
          <div className="flex items-center space-x-3 overflow-hidden">
            <img
              src={currentSong?.artwork_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
              alt="Track"
              className="w-12 h-12 rounded-xl object-cover"
            />
            <div className="overflow-hidden">
              <h5 className="text-sm font-bold text-white truncate">{currentSong?.title || 'Industry Baby'}</h5>
              <p className="text-xs text-[#A1A1AA] truncate">{currentSong?.artist_name || 'Lil Nas X'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 pr-1">
            {/* Live green audio equalizer bars */}
            <div className="flex items-end space-x-1 h-5">
              <span className="w-1 bg-[#1ED760] h-full animate-equalizer-1 rounded-full" />
              <span className="w-1 bg-[#1ED760] h-full animate-equalizer-2 rounded-full" />
              <span className="w-1 bg-[#1ED760] h-full animate-equalizer-3 rounded-full" />
              <span className="w-1 bg-[#1ED760] h-full animate-equalizer-4 rounded-full" />
            </div>

            {isHost && (
              <button
                onClick={() => (isPlaying ? hostPause() : hostPlay())}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Participants List matching Screen 5 */}
      <div className="px-6 pt-5 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider">
            Participants ({participants.length})
          </h4>
        </div>

        <div className="space-y-2">
          {participants.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#12141B]/60 border border-[#1B1E28]"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={p.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#1ED760] rounded-full border border-black" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-semibold text-white">
                      {p.display_name || p.username}
                    </span>
                    {p.is_host && (
                      <span className="flex items-center text-xs text-amber-400 font-bold">
                        (Host) 👑
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#A1A1AA]">Synchronized</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leave Room Button matching Screen 5 */}
      <div className="px-6 pt-4 pb-2">
        <button
          onClick={leaveRoom}
          className="w-full h-11 bg-transparent hover:bg-red-500/10 border border-red-500/40 text-red-400 font-bold rounded-full flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Room</span>
        </button>
      </div>
    </div>
  );
};

