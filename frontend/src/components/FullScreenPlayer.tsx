import React, { useState } from 'react';
import {
  ChevronDown, Cast, MoreVertical, Heart, Shuffle, SkipBack, Play, Pause,
  SkipForward, Repeat, FileText, ListMusic, Volume2, VolumeX
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { api } from '../services/api';
import { LyricsDrawer } from './LyricsDrawer';
import { QueueDrawer } from './QueueDrawer';

export const FullScreenPlayer: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    isFullScreenOpen,
    setFullScreenOpen,
    isLyricsOpen,
    setLyricsOpen,
  } = useAudioPlayer();

  const [activeTab, setActiveTab] = useState<'song' | 'queue'>('song');
  const [isFav, setIsFav] = useState<boolean>(currentSong?.is_favorite || false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);

  React.useEffect(() => {
    setIsFav(currentSong?.is_favorite || false);
  }, [currentSong?.id, currentSong?.is_favorite]);

  if (!isFullScreenOpen || !currentSong) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await api.favorites.toggle(currentSong.id);
      setIsFav(res.is_favorite);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#08090D] flex flex-col justify-between max-w-md mx-auto overflow-hidden safe-area-inset">
      {/* Background Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#1ED760]/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-12 pb-4">
        <button
          onClick={() => setFullScreenOpen(false)}
          className="p-2 text-[#A1A1AA] hover:text-white transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Song / Queue Pill */}
        <div className="flex bg-[#1B1E28]/80 backdrop-blur-md rounded-full p-1 border border-[#242836]">
          <button
            onClick={() => setActiveTab('song')}
            className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'song' ? 'bg-[#1ED760] text-black shadow-md' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Song
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-1 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'queue' ? 'bg-[#1ED760] text-black shadow-md' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            Queue
          </button>
        </div>

        <div className="flex items-center space-x-1 text-[#A1A1AA]">
          <button className="p-2 hover:text-white">
            <Cast className="w-5 h-5" />
          </button>
          <button className="p-2 hover:text-white">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {activeTab === 'queue' ? (
        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <QueueDrawer />
        </div>
      ) : (
        <>
          {/* Giant Cyberpunk Artwork */}
          <div className="relative z-10 px-8 flex-1 flex items-center justify-center my-2">
            <div className="relative w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden shadow-[0_15px_40px_rgba(139,92,246,0.35)] border border-purple-500/20 group">
              <img
                src={currentSong.artwork_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'}
                alt={currentSong.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            </div>
          </div>

          {/* Song Info & Favorite */}
          <div className="relative z-10 px-8 flex items-center justify-between">
            <div className="overflow-hidden pr-4">
              <h1 className="text-2xl font-bold text-white truncate">{currentSong.title}</h1>
              <p className="text-base text-[#A1A1AA] mt-1 truncate">{currentSong.artist_name || 'Lil Nas X'}</p>
            </div>
            <button
              onClick={handleToggleFavorite}
              className="p-2 text-[#A1A1AA] hover:text-[#1ED760] transition-colors"
            >
              <Heart
                className={`w-7 h-7 transition-transform active:scale-125 ${
                  isFav ? 'fill-[#1ED760] text-[#1ED760]' : ''
                }`}
              />
            </button>
          </div>

          {/* Seekbar */}
          <div className="relative z-10 px-8 mt-6">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-[#1B1E28] rounded-lg appearance-none cursor-pointer accent-[#1ED760]"
            />
            <div className="flex justify-between text-xs text-[#A1A1AA] mt-2 font-medium">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="relative z-10 px-6 flex items-center justify-between mt-4">
            <button
              onClick={toggleShuffle}
              className={`p-2 transition-colors ${
                isShuffle ? 'text-[#1ED760]' : 'text-[#71717A] hover:text-white'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            <button
              onClick={prevTrack}
              className="p-3 text-white hover:text-[#1ED760] transition-colors active:scale-90"
            >
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-[0_0_25px_rgba(30,215,96,0.6)] hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-3 text-white hover:text-[#1ED760] transition-colors active:scale-90"
            >
              <SkipForward className="w-7 h-7 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-2 transition-colors ${
                isRepeat ? 'text-[#1ED760]' : 'text-[#71717A] hover:text-white'
              }`}
            >
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          {/* Volume Control Slider */}
          <div className="relative z-10 px-10 flex items-center space-x-3 mt-4">
            <button onClick={toggleMute} className="text-[#A1A1AA] hover:text-white">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-1 bg-[#1B1E28] rounded-lg appearance-none cursor-pointer accent-[#1ED760]"
            />
          </div>

          {/* Bottom Bar: Lyrics & Queue Drawer */}
          <div className="relative z-10 px-8 pt-3 pb-8 flex items-center justify-between">
            <button
              onClick={() => setLyricsOpen(true)}
              className="flex items-center space-x-2 bg-[#12141B] px-4 py-2 rounded-full border border-[#1B1E28] text-xs font-semibold text-white hover:bg-[#1B1E28] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#1ED760]" />
              <span>Lyrics</span>
            </button>

            <button
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className="p-2 text-[#A1A1AA] hover:text-white transition-colors"
            >
              <ListMusic className="w-6 h-6" />
            </button>
          </div>
        </>
      )}

      {/* Lyrics Modal / Drawer */}
      {isLyricsOpen && <LyricsDrawer onClose={() => setLyricsOpen(false)} />}
    </div>
  );
};

