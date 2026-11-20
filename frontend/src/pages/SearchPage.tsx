import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, Play, Heart, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { Song, Artist } from '../types';
import { useAudioPlayer } from '../context/AudioPlayerContext';

export const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [popularArtists, setPopularArtists] = useState<Artist[]>([]);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const { playSong } = useAudioPlayer();

  const filterTabs = ['All', 'Songs', 'Artists', 'Albums', 'Playlists'];

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [trending, artists] = await Promise.all([
          api.recommendations.getTrending().catch(() => []),
          api.recommendations.getPopularArtists().catch(() => []),
        ]);
        setTrendingSongs(trending);
        setPopularArtists(artists);
      } catch (e) {
        console.error(e);
      }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.songs.getAll({ search: searchTerm.trim() });
        setSearchResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-md mx-auto overflow-x-hidden">
      {/* Search Header */}
      <div className="px-6 pt-12 pb-3">
        <div className="relative">
          <SearchIcon className="w-5 h-5 text-[#A1A1AA] absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full bg-[#12141B] border border-[#1B1E28] rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-3.5 text-[#71717A] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs matching Screen 6 */}
      <div className="flex space-x-2 px-6 py-2 overflow-x-auto scrollbar-none">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#1ED760] text-black shadow-md shadow-[#1ED760]/20'
                  : 'bg-[#12141B] text-[#A1A1AA] border border-[#1B1E28] hover:text-white'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* If Searching: Display Results */}
      {searchTerm.trim() ? (
        <div className="px-6 pt-4">
          <h3 className="text-sm font-bold text-[#A1A1AA] uppercase tracking-wider mb-3">
            {isSearching ? 'Searching...' : `Results for "${searchTerm}"`}
          </h3>
          {searchResults.length === 0 && !isSearching ? (
            <div className="text-center py-12 text-[#71717A] text-sm">
              No results found for "{searchTerm}".
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((song) => (
                <div
                  key={song.id}
                  onClick={() => playSong(song, searchResults)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#12141B] hover:bg-[#1B1E28] border border-[#1B1E28] cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <img
                      src={song.artwork_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
                      alt={song.title}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                      <p className="text-xs text-[#A1A1AA] truncate">{song.artist_name}</p>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-[#1ED760]/10 hover:bg-[#1ED760] text-[#1ED760] hover:text-black flex items-center justify-center transition-colors">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Trending Now Section matching Screen 6 */}
          <div className="pt-4">
            <div className="flex items-center justify-between px-6 mb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-1">
                <span>Trending Now</span>
                <span>🔥</span>
              </h3>
              <span className="text-xs font-semibold text-[#A1A1AA]">See all</span>
            </div>

            <div className="flex space-x-4 px-6 overflow-x-auto scrollbar-none pb-2">
              {trendingSongs.slice(0, 6).map((song) => (
                <div
                  key={song.id}
                  onClick={() => playSong(song, trendingSongs)}
                  className="flex-shrink-0 w-32 cursor-pointer group"
                >
                  <div className="relative w-32 h-32 rounded-2xl overflow-hidden mb-2 shadow-lg group-hover:scale-105 transition-transform">
                    <img
                      src={song.artwork_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'}
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

          {/* Popular Artists Section matching Screen 6 */}
          <div className="pt-6">
            <div className="flex items-center justify-between px-6 mb-3">
              <h3 className="text-base font-bold text-white">Popular Artists</h3>
              <span className="text-xs font-semibold text-[#A1A1AA]">See all</span>
            </div>

            <div className="flex space-x-5 px-6 overflow-x-auto scrollbar-none pb-2">
              {popularArtists.map((artist) => (
                <div key={artist.id} className="flex flex-col items-center flex-shrink-0 cursor-pointer group">
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-2 p-[2px] bg-gradient-to-tr from-purple-500/40 to-[#1ED760]/40 group-hover:from-purple-500 group-hover:to-[#1ED760] transition-colors shadow-lg">
                    <img
                      src={artist.image_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'}
                      alt={artist.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-white text-center truncate max-w-[80px]">
                    {artist.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

