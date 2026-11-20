import React, { useEffect, useState } from 'react';
import { Bell, Search, Play, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { api } from '../services/api';
import { Song } from '../types';

interface HomePageProps {
  onNavigateTab: (tab: 'home' | 'search' | 'library' | 'group' | 'profile') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const { playSong } = useAudioPlayer();
  const [madeForYou, setMadeForYou] = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [made, recent] = await Promise.all([
          api.recommendations.getMadeForYou().catch(() => []),
          api.recommendations.getRecentlyPlayed().catch(() => []),
        ]);
        setMadeForYou(made);
        setRecentlyPlayed(recent);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.display_name || user?.username || 'Tobi';

  return (
    <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-md mx-auto overflow-x-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-1.5">
            <span>{getGreeting()}, {displayName}!</span>
            <span>👋</span>
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">Let's find your next favourite song</p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="relative p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#12141B] border border-[#1B1E28]">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#1ED760] rounded-full shadow-[0_0_6px_#1ED760]" />
          </button>
          <div
            onClick={() => onNavigateTab('profile')}
            className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-purple-500 to-[#1ED760] cursor-pointer"
          >
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="px-6 py-2">
        <div
          onClick={() => onNavigateTab('search')}
          className="flex items-center space-x-3 px-4 py-3 bg-[#12141B] rounded-2xl border border-[#1B1E28] text-[#71717A] cursor-pointer hover:border-[#242836] transition-colors"
        >
          <Search className="w-5 h-5 text-[#A1A1AA]" />
          <span className="text-sm">Search songs, artists, albums...</span>
        </div>
      </div>

      {/* Hero Banner Card matching Screen 3 */}
      <div className="px-6 pt-3 pb-4">
        <div className="relative rounded-3xl overflow-hidden p-6 bg-gradient-to-r from-purple-900/60 to-indigo-950/80 border border-purple-500/20 shadow-xl group">
          {/* Cyberpunk Silhouette backdrop */}
          <div className="absolute right-0 bottom-0 top-0 w-1/2 overflow-hidden pointer-events-none opacity-40">
            <img
              src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80"
              alt="Anime Silhouette"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-10 max-w-[200px]">
            <h3 className="text-2xl font-black text-white leading-tight">
              Music Brings Us Together 🎵
            </h3>
            <button
              onClick={() => onNavigateTab('group')}
              className="mt-4 px-5 py-2.5 rounded-full bg-[#8B5CF6] hover:bg-[#7c3aed] text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center space-x-2 active:scale-95 transition-all"
            >
              <span>Listen Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Made for You Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between px-6 mb-3">
          <h3 className="text-base font-bold text-white">Made for You</h3>
          <button onClick={() => onNavigateTab('search')} className="text-xs font-semibold text-[#A1A1AA] hover:text-[#1ED760]">
            See all
          </button>
        </div>

        <div className="flex space-x-4 px-6 overflow-x-auto scrollbar-none pb-2">
          {madeForYou.map((song) => (
            <div
              key={song.id}
              onClick={() => playSong(song, madeForYou)}
              className="flex-shrink-0 w-32 cursor-pointer group"
            >
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden mb-2 shadow-lg group-hover:scale-105 transition-transform">
                <img
                  src={song.artwork_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80'}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                <button className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-[#1ED760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
              <h4 className="text-xs font-bold text-white truncate">{song.title}</h4>
              <p className="text-[11px] text-[#A1A1AA] truncate">{song.artist_name || song.genre}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Played Section */}
      <div className="pt-4">
        <div className="flex items-center justify-between px-6 mb-3">
          <h3 className="text-base font-bold text-white">Recently Played</h3>
          <button onClick={() => onNavigateTab('library')} className="text-xs font-semibold text-[#A1A1AA] hover:text-[#1ED760]">
            See all
          </button>
        </div>

        <div className="flex space-x-4 px-6 overflow-x-auto scrollbar-none pb-2">
          {recentlyPlayed.map((song) => (
            <div
              key={song.id}
              onClick={() => playSong(song, recentlyPlayed)}
              className="flex-shrink-0 w-32 cursor-pointer group"
            >
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden mb-2 shadow-lg group-hover:scale-105 transition-transform">
                <img
                  src={song.artwork_url || 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80'}
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
                <button className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-[#1ED760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
              <h4 className="text-xs font-bold text-white truncate">{song.title}</h4>
              <p className="text-[11px] text-[#A1A1AA] truncate">{song.artist_name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

