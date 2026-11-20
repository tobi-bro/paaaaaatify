import React, { useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AudioPlayerProvider, useAudioPlayer } from './context/AudioPlayerContext';
import { RoomProvider } from './context/RoomContext';
import { SplashPage } from './pages/SplashPage';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { LibraryPage } from './pages/LibraryPage';
import { RoomPage } from './pages/RoomPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { BottomNav, TabType } from './components/BottomNav';
import { MiniPlayer } from './components/MiniPlayer';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { LockScreenPreview } from './components/LockScreenPreview';
import { Playlist } from './types';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { isFullScreenOpen, setFullScreenOpen, isLyricsOpen, setLyricsOpen } = useAudioPlayer();
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showLockScreenPreview, setShowLockScreenPreview] = useState<boolean>(false);

  // Native Android hardware back-button handler
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backButtonHandler = CapApp.addListener('backButton', () => {
      if (isLyricsOpen) {
        setLyricsOpen(false);
      } else if (isFullScreenOpen) {
        setFullScreenOpen(false);
      } else if (showLockScreenPreview) {
        setShowLockScreenPreview(false);
      } else if (isAdminOpen) {
        setIsAdminOpen(false);
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else if (selectedPlaylist) {
        setSelectedPlaylist(null);
      } else if (activeTab !== 'home') {
        setActiveTab('home');
      } else {
        CapApp.exitApp();
      }
    });

    return () => {
      backButtonHandler.then((handle) => handle.remove()).catch(() => { });
    };
  }, [isLyricsOpen, isFullScreenOpen, showLockScreenPreview, isAdminOpen, isSettingsOpen, selectedPlaylist, activeTab, setLyricsOpen, setFullScreenOpen]);

  if (showSplash) {
    return <SplashPage onFinish={() => setShowSplash(false)} />;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#08090D] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#1ED760] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#08090D] text-white font-sans relative selection:bg-[#1ED760] selection:text-black">
      {/* Admin Screen */}
      {isAdminOpen ? (
        <AdminPage onBack={() => setIsAdminOpen(false)} />
      ) : isSettingsOpen ? (
        <SettingsPage
          onBack={() => setIsSettingsOpen(false)}
          onOpenLockScreenPreview={() => setShowLockScreenPreview(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />
      ) : selectedPlaylist ? (
        <PlaylistDetailPage
          playlist={selectedPlaylist}
          onBack={() => setSelectedPlaylist(null)}
        />
      ) : (
        <>
          {activeTab === 'home' && <HomePage onNavigateTab={(tab) => setActiveTab(tab)} />}
          {activeTab === 'search' && <SearchPage />}
          {activeTab === 'library' && (
            <LibraryPage onSelectPlaylist={(pl) => setSelectedPlaylist(pl)} />
          )}
          {activeTab === 'group' && <RoomPage />}
          {activeTab === 'profile' && (
            <ProfilePage onOpenSettings={() => setIsSettingsOpen(true)} />
          )}

          {/* Persistent Mini Player & Bottom Navigation */}
          <MiniPlayer />
          <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
        </>
      )}

      {/* Full-Screen Music Player Modal */}
      <FullScreenPlayer />

      {/* Android Lock-Screen & Media Preview Modal */}
      {showLockScreenPreview && (
        <LockScreenPreview onClose={() => setShowLockScreenPreview(false)} />
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <RoomProvider>
          <MainAppContent />
        </RoomProvider>
      </AudioPlayerProvider>
    </AuthProvider>
  );
}

export default App;

