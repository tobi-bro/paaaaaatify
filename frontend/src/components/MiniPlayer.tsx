import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { api } from '../services/api';

export const MiniPlayer: React.FC = () => {
  const { currentSong, isPlaying, togglePlay, currentTime, duration, setFullScreenOpen } = useAudioPlayer();
  const [isFav, setIsFav] = React.useState<boolean>(currentSong?.is_favorite || false);

  React.useEffect(() => {
    setIsFav(currentSong?.is_favorite || false);
  }, [currentSong?.id, currentSong?.is_favorite]);

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.favorites.toggle(currentSong.id);
      setIsFav(res.is_favorite);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      onClick={() => setFullScreenOpen(true)}
      className="fixed bottom-[68px] left-3 right-3 max-w-md mx-auto z-40 bg-[#12141B]/95 backdrop-blur-xl border border-[#1B1E28] rounded-xl shadow-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between p-2.5">
        <div className="flex items-center space-x-3 overflow-hidden">
          <img
            src={currentSong.artwork_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
            alt={currentSong.title}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-md"
          />
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{currentSong.title}</h4>
            <p className="text-xs text-[#A1A1AA] truncate">{currentSong.artist_name || 'Lil Nas X'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0 pr-1">
          <button
            onClick={handleToggleFavorite}
            className="p-1.5 text-[#A1A1AA] hover:text-[#1ED760] transition-colors"
          >
            <Heart
              className={`w-5 h-5 ${isFav ? 'fill-[#1ED760] text-[#1ED760]' : ''}`}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="w-full bg-[#1B1E28] h-[3px]">
        <div
          className="bg-[#1ED760] h-full shadow-[0_0_8px_#1ED760]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

