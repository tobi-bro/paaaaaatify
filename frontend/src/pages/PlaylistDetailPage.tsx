import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Shuffle, Heart, Trash2, Clock, Music } from 'lucide-react';
import { Playlist, Song } from '../types';
import { api } from '../services/api';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface PlaylistDetailPageProps {
  playlist: Playlist;
  onBack: () => void;
}

export const PlaylistDetailPage: React.FC<PlaylistDetailPageProps> = ({ playlist, onBack }) => {
  const [details, setDetails] = useState<Playlist>(playlist);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const { playSong } = useAudioPlayer();

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.playlists.getById(playlist.id);
        setDetails(res);
        setSongs(res.songs || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [playlist.id]);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  const totalDurationSeconds = songs.reduce((acc, s) => acc + s.duration_seconds, 0);
  const totalMins = Math.floor(totalDurationSeconds / 60);

  return (
    <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-md mx-auto overflow-x-hidden">
      {/* Header with back button */}
      <div className="relative h-64 w-full">
        <img
          src={details.cover_art_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80'}
          alt={details.title}
          className="w-full h-full object-cover filter brightness-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090D] via-transparent to-black/40" />

        <button
          onClick={onBack}
          className="absolute top-12 left-6 p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 left-6 right-6">
          <h1 className="text-2xl font-black text-white truncate drop-shadow-md">{details.title}</h1>
          <p className="text-xs text-gray-300 mt-1 line-clamp-1">{details.description || 'Paaaaaaatify Curated Playlist'}</p>
          <p className="text-[11px] text-[#1ED760] font-semibold mt-1">
            {songs.length} songs • {totalMins} mins
          </p>
        </div>
      </div>

      {/* Play Controls Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1B1E28]">
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePlayAll}
            className="w-12 h-12 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-lg shadow-[#1ED760]/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </button>
          <button
            onClick={handlePlayAll}
            className="p-2.5 rounded-full bg-[#12141B] text-[#A1A1AA] hover:text-white border border-[#1B1E28]"
          >
            <Shuffle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Song List */}
      <div className="px-6 pt-3 flex-1 space-y-2">
        {songs.length === 0 ? (
          <div className="text-center py-12 text-[#71717A] text-sm">
            This playlist has no songs yet. Add songs from Search!
          </div>
        ) : (
          songs.map((song, idx) => (
            <div
              key={song.id}
              onClick={() => playSong(song, songs)}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-[#12141B]/60 hover:bg-[#1B1E28] cursor-pointer transition-colors border border-transparent hover:border-[#242836]"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <span className="text-xs font-bold text-[#71717A] w-4 text-center">{idx + 1}</span>
                <img
                  src={song.artwork_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}
                  alt={song.title}
                  className="w-11 h-11 rounded-xl object-cover"
                />
                <div className="overflow-hidden">
                  <h4 className="text-sm font-semibold text-white truncate">{song.title}</h4>
                  <p className="text-xs text-[#A1A1AA] truncate">{song.artist_name}</p>
                </div>
              </div>

              <span className="text-xs text-[#71717A] font-medium pr-2">
                {Math.floor(song.duration_seconds / 60)}:{(song.duration_seconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

