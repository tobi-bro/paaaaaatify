import React from 'react';
import { Play, Pause, Flashlight, Camera, X } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface LockScreenPreviewProps {
  onClose: () => void;
}

export const LockScreenPreview: React.FC<LockScreenPreviewProps> = ({ onClose }) => {
  const { currentSong, isPlaying, togglePlay, currentTime, duration } = useAudioPlayer();

  const progress = duration > 0 ? (currentTime / duration) * 100 : 40;

  return (
    <div className="fixed inset-0 z-50 bg-[#08090D] flex flex-col justify-between p-6 max-w-md mx-auto overflow-hidden text-white font-sans animate-fadeIn">
      {/* Background Cyberpunk Wallpaper matching mockup */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1080&auto=format&fit=crop&q=80"
          alt="Wallpaper"
          className="w-full h-full object-cover opacity-60 filter brightness-75 contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08090D]/50 via-transparent to-[#08090D]/90" />
      </div>

      {/* Close button for preview */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/40 backdrop-blur-md text-[#A1A1AA] hover:text-white border border-white/10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Top Lock Screen Clock (9:41 Sat, Nov 1) */}
      <div className="relative z-10 text-center pt-16">
        <h1 className="text-7xl font-extrabold tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          9:41
        </h1>
        <p className="text-base text-gray-200 font-medium mt-1 drop-shadow-md">
          Sat, Nov 1
        </p>
      </div>

      {/* Lock Screen Music Widget */}
      <div className="relative z-10 mx-auto w-full max-w-sm bg-[#12141B]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <img
              src={currentSong?.artwork_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
              alt="Artwork"
              className="w-12 h-12 rounded-xl object-cover shadow-md"
            />
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-white truncate">
                {currentSong?.title || 'Industry Baby'}
              </h3>
              <p className="text-xs text-gray-300 truncate">
                {currentSong?.artist_name || 'Lil Nas X'}
              </p>
            </div>
          </div>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-white text-white" />
            ) : (
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            )}
          </button>
        </div>

        {/* Green progress line */}
        <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
          <div className="bg-[#1ED760] h-full shadow-[0_0_8px_#1ED760]" style={{ width: `${progress}%` }} />
        </div>

        {/* Paaaaaaatify Branding at widget bottom */}
        <div className="flex items-center justify-center space-x-2 mt-3 pt-2 border-t border-white/5">
          <img src="/logo.svg" alt="P" className="w-4 h-4" />
          <span className="text-[11px] font-bold text-[#1ED760] tracking-wider uppercase">Paaaaaaatify</span>
        </div>
      </div>

      {/* Bottom Lock Screen Shortcuts (Flashlight & Camera) */}
      <div className="relative z-10 flex items-center justify-between pb-8 px-4">
        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
          <Flashlight className="w-5 h-5" />
        </button>

        <p className="text-xs text-gray-300/80 font-medium tracking-wide">
          Swipe up to unlock
        </p>

        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
          <Camera className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

