import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Play, Edit3, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { api } from '../services/api';
import { Song } from '../types';

interface ProfilePageProps {
  onOpenSettings: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenSettings }) => {
  const { user, stats, refreshProfile } = useAuth();
  const { playSong } = useAudioPlayer();
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.display_name || 'Tobi');
  const [editBio, setEditBio] = useState(user?.bio || 'Music Lover • Dream Big 🎵');

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const recent = await api.recommendations.getRecentlyPlayed();
        setRecentlyPlayed(recent);
      } catch (e) {
        console.error(e);
      }
    };
    fetchRecent();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.users.updateProfile({ display_name: editName, bio: editBio });
      await refreshProfile();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const displayName = user?.display_name || 'Tobi';
  const username = user?.username || 'tobi_bro';

  return (
    <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-md mx-auto overflow-x-hidden">
      {/* Top Header with Settings Gear */}
      <div className="flex items-center justify-end px-6 pt-12 pb-2">
        <button
          onClick={onOpenSettings}
          className="p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#12141B] border border-[#1B1E28]"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Header matching Screen 8 */}
      <div className="flex flex-col items-center px-6 pt-2 pb-6">
        {/* Avatar with glowing purple ring */}
        <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-purple-600 via-indigo-500 to-[#1ED760] shadow-[0_0_30px_rgba(139,92,246,0.45)] mb-3">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80'}
            alt={displayName}
            className="w-full h-full rounded-full object-cover"
          />
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">{displayName}</h2>
        <p className="text-xs text-[#A1A1AA] mt-0.5">@{username}</p>
        <p className="text-xs text-gray-300 font-medium mt-1 text-center">
          {user?.bio || 'Music Lover • Dream Big 🎵'}
        </p>

        {/* Stats Row matching Screen 8 */}
        <div className="flex items-center justify-center space-x-8 mt-5 py-3 px-6 bg-[#12141B] border border-[#1B1E28] rounded-2xl w-full">
          <div className="text-center">
            <h4 className="text-lg font-bold text-white">{stats?.playlists_count || 87}</h4>
            <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">Playlists</p>
          </div>
          <div className="w-[1px] h-7 bg-[#242836]" />
          <div className="text-center">
            <h4 className="text-lg font-bold text-white">12.5K</h4>
            <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">Followers</p>
          </div>
          <div className="w-[1px] h-7 bg-[#242836]" />
          <div className="text-center">
            <h4 className="text-lg font-bold text-white">243</h4>
            <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">Following</p>
          </div>
        </div>

        {/* Edit Profile Button matching Screen 8 */}
        <button
          onClick={() => setIsEditing(true)}
          className="mt-4 px-8 py-2 rounded-full bg-[#1B1E28] hover:bg-[#242836] border border-[#242836] text-xs font-semibold text-white active:scale-95 transition-all"
        >
          Edit Profile
        </button>
      </div>

      {/* Recently Played Section matching Screen 8 */}
      <div className="px-6 pt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">Recently Played</h3>
          <span className="text-xs font-semibold text-[#A1A1AA]">See all</span>
        </div>

        <div className="space-y-2.5">
          {recentlyPlayed.slice(0, 5).map((song) => (
            <div
              key={song.id}
              onClick={() => playSong(song, recentlyPlayed)}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-[#12141B] hover:bg-[#1B1E28] border border-[#1B1E28] cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <img
                  src={song.artwork_url || 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=120&auto=format&fit=crop&q=80'}
                  alt={song.title}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div className="overflow-hidden">
                  <h5 className="text-sm font-semibold text-white truncate">{song.title}</h5>
                  <p className="text-xs text-[#A1A1AA] truncate">{song.artist_name}</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-full bg-[#1ED760]/10 hover:bg-[#1ED760] text-[#1ED760] hover:text-black flex items-center justify-center transition-colors">
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#12141B] border border-[#1B1E28] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-[#A1A1AA] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#1B1E28] border border-[#242836] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#1ED760]"
                />
              </div>

              <div>
                <label className="text-xs text-[#A1A1AA] block mb-1">Bio</label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-[#1B1E28] border border-[#242836] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#1ED760]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#1ED760] hover:bg-[#1bc456] text-black font-bold rounded-full transition-all mt-4"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

