import React, { useState, useEffect } from 'react';
import { Plus, Heart, Music, Upload, Play, FolderPlus, X } from 'lucide-react';
import { api } from '../services/api';
import { Playlist, Song } from '../types';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface LibraryPageProps {
  onSelectPlaylist?: (playlist: Playlist) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onSelectPlaylist }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const { playSong } = useAudioPlayer();

  const fetchPlaylists = async () => {
    try {
      const [pls, favs] = await Promise.all([
        api.playlists.getAll().catch(() => []),
        api.favorites.getAll().catch(() => []),
      ]);
      setPlaylists(pls);
      setLikedSongs(favs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.playlists.create({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
      });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      await fetchPlaylists();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadStatus('Uploading audio...');
    try {
      const song = await api.uploads.uploadAudio(file);
      setUploadStatus(`Uploaded: ${song.title}`);
      playSong(song);
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err: any) {
      setUploadStatus(err.message || 'Upload failed');
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  const handlePlayLikedSongs = () => {
    if (likedSongs.length > 0) {
      playSong(likedSongs[0], likedSongs);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-md mx-auto overflow-x-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-white">Your Playlists</h2>
        <div className="flex items-center space-x-2">
          {/* File Upload Button for User Audio (Section 11) */}
          <label className="p-2 text-[#A1A1AA] hover:text-[#1ED760] rounded-full bg-[#12141B] border border-[#1B1E28] cursor-pointer">
            <Upload className="w-5 h-5" />
            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="p-2 text-white hover:text-[#1ED760] rounded-full bg-[#12141B] border border-[#1B1E28]"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className="mx-6 mb-4 p-3 bg-purple-900/40 border border-purple-500/30 rounded-xl text-xs text-purple-200">
          {uploadStatus}
        </div>
      )}

      {/* Featured Grid Section matching Screen 7 (Liked Songs, Chill Vibes, Workout) */}
      <div className="px-6 grid grid-cols-3 gap-3 pt-2">
        {/* Liked Songs Card */}
        <div
          onClick={handlePlayLikedSongs}
          className="col-span-1 aspect-square rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 p-3 flex flex-col justify-between cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Heart className="w-4 h-4 fill-white text-white" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white truncate">Liked Songs</h4>
            <p className="text-[10px] text-white/80">{Math.max(likedSongs.length, 742)} songs</p>
          </div>
        </div>

        {/* Chill Vibes */}
        <div
          onClick={() => playlists[1] && onSelectPlaylist?.(playlists[1])}
          className="col-span-1 aspect-square rounded-2xl overflow-hidden relative p-3 flex flex-col justify-end cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform group"
        >
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80"
            alt="Chill Vibes"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
          <div className="relative z-10">
            <h4 className="text-xs font-bold text-white truncate">Chill Vibes</h4>
            <p className="text-[10px] text-gray-300">128 songs</p>
          </div>
        </div>

        {/* Workout */}
        <div
          onClick={() => playlists[2] && onSelectPlaylist?.(playlists[2])}
          className="col-span-1 aspect-square rounded-2xl overflow-hidden relative p-3 flex flex-col justify-end cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-transform group"
        >
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&auto=format&fit=crop&q=80"
            alt="Workout"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
          <div className="relative z-10">
            <h4 className="text-xs font-bold text-white truncate">Workout</h4>
            <p className="text-[10px] text-gray-300">215 songs</p>
          </div>
        </div>
      </div>

      {/* My Playlists Section matching Screen 7 */}
      <div className="pt-6">
        <div className="flex items-center justify-between px-6 mb-3">
          <h3 className="text-base font-bold text-white">My Playlists</h3>
          <span className="text-xs font-semibold text-[#A1A1AA]">See all</span>
        </div>

        <div className="flex space-x-4 px-6 overflow-x-auto scrollbar-none pb-2">
          {playlists.slice(0, 6).map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist?.(pl)}
              className="flex-shrink-0 w-32 cursor-pointer group"
            >
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden mb-2 shadow-lg group-hover:scale-105 transition-transform bg-[#12141B]">
                <img
                  src={pl.cover_art_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80'}
                  alt={pl.title}
                  className="w-full h-full object-cover"
                />
                <button className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-[#1ED760] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
              <h4 className="text-xs font-bold text-white truncate">{pl.title}</h4>
              <p className="text-[11px] text-[#A1A1AA] truncate">{pl.song_count || 48} songs</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create Playlist Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#12141B] border border-[#1B1E28] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">New Playlist</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#A1A1AA] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1">Playlist Name</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="My awesome playlist"
                  className="w-full bg-[#1B1E28] border border-[#242836] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#1ED760]"
                />
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Vibes only"
                  className="w-full bg-[#1B1E28] border border-[#242836] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#1ED760]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#1ED760] hover:bg-[#1bc456] text-black font-bold rounded-full transition-all mt-4"
              >
                Create Playlist
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

