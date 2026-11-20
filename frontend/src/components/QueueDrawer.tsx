import React from 'react';
import { Play, Pause, Music, Trash2 } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export const QueueDrawer: React.FC = () => {
  const { queue, queueIndex, currentSong, playSong, isPlaying } = useAudioPlayer();

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Now Playing</h3>
        {currentSong && (
          <div className="flex items-center space-x-3 p-3 bg-[#12141B] rounded-xl border border-[#1ED760]/30 shadow-lg">
            <img
              src={currentSong.artwork_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
              alt={currentSong.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 overflow-hidden">
              <h4 className="font-semibold text-white truncate">{currentSong.title}</h4>
              <p className="text-xs text-[#1ED760] truncate">{currentSong.artist_name}</p>
            </div>
            {/* Live equalizer animation */}
            <div className="flex items-end space-x-1 h-5 px-2">
              <span className="w-1 bg-[#1ED760] h-full animate-equalizer-1 rounded-full" />
              <span className="w-1 bg-[#1ED760] h-full animate-equalizer-2 rounded-full" />
              <span className="w-1 bg-[#1ED760] h-full animate-equalizer-3 rounded-full" />
              <span className="w-1 bg-[#1ED760] h-full animate-equalizer-4 rounded-full" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">Next In Queue</h3>
        {queue.length <= 1 ? (
          <div className="text-center py-10 text-[#71717A] text-sm">
            Queue is empty. Select songs from search or playlists to play next.
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((song, idx) => {
              if (idx === queueIndex) return null;
              return (
                <div
                  key={`${song.id}-${idx}`}
                  onClick={() => playSong(song)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#12141B]/60 hover:bg-[#1B1E28] cursor-pointer transition-colors border border-transparent hover:border-[#242836]"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <img
                      src={song.artwork_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
                      alt={song.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="overflow-hidden">
                      <h5 className="text-sm font-medium text-white truncate">{song.title}</h5>
                      <p className="text-xs text-[#A1A1AA] truncate">{song.artist_name}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#71717A]">
                    {Math.floor(song.duration_seconds / 60)}:{(song.duration_seconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

