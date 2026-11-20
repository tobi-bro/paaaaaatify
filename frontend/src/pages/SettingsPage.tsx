import React, { useState } from 'react';
import {
  ArrowLeft, Bell, Database, PlayCircle, Moon, Shield, HelpCircle, Info, LogOut, Smartphone, ChevronRight, Server, Check, X, RefreshCw, AlertCircle, Trash2, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl, setStoredApiUrl, resetStoredApiUrl, checkServerConnection } from '../services/api';

interface SettingsPageProps {
  onBack: () => void;
  onOpenLockScreenPreview: () => void;
  onOpenAdmin?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, onOpenLockScreenPreview, onOpenAdmin }) => {
  const { user, settings, updateSettings, logout, deleteAccount } = useAuth();
  const [notifications, setNotifications] = useState(settings?.notifications ?? true);
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await checkServerConnection(serverUrlInput);
      if (res.ok) {
        setConnectionStatus({ ok: true, message: `Connected! Server status: ${res.status}` });
      } else {
        setConnectionStatus({ ok: false, message: res.message || 'Cannot reach server' });
      }
    } catch (err: any) {
      setConnectionStatus({ ok: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveServerUrl = () => {
    const result = setStoredApiUrl(serverUrlInput);
    if (result.success && result.normalized) {
      setServerUrlInput(result.normalized);
      setShowServerModal(false);
      setConnectionStatus(null);
    } else {
      setConnectionStatus({ ok: false, message: result.error || 'Invalid API URL' });
    }
  };

  const handleResetServerUrl = () => {
    resetStoredApiUrl();
    setServerUrlInput(getApiBaseUrl());
    setConnectionStatus(null);
  };

  const handleToggleNotifications = async () => {
    const newVal = !notifications;
    setNotifications(newVal);
    await updateSettings({ notifications: newVal }).catch(() => { });
  };

  const displayName = user?.display_name || 'Tobi';
  const username = user?.username || 'tobi_bro';

  return (
    <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-md mx-auto overflow-x-hidden">
      {/* Top Header */}
      <div className="flex items-center space-x-3 px-6 pt-12 pb-4">
        <button onClick={onBack} className="p-2 text-[#A1A1AA] hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white">Settings</h2>
      </div>

      {/* User Card matching Screen 9 */}
      <div className="px-6 pb-6">
        <div className="flex items-center space-x-4 p-4 rounded-3xl bg-[#12141B] border border-[#1B1E28]">
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80'}
            alt={displayName}
            className="w-14 h-14 rounded-full object-cover border border-purple-500/40"
          />
          <div className="flex-1 overflow-hidden">
            <h3 className="font-bold text-white text-base truncate">{displayName}</h3>
            <p className="text-xs text-[#A1A1AA] truncate">@{username}</p>
            <p className="text-xs text-[#1ED760] font-medium mt-0.5">Manage Profile</p>
          </div>
        </div>
      </div>

      {/* Settings List matching Screen 9 */}
      <div className="px-6 space-y-2 flex-1">
        {/* Admin Dashboard Entry (if user is admin) */}
        {user?.is_admin && onOpenAdmin && (
          <div
            onClick={onOpenAdmin}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 cursor-pointer hover:bg-purple-900/40 transition-colors shadow-lg"
          >
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <div>
                <span className="text-sm font-bold text-white block">Admin Operations Hub</span>
                <span className="text-[11px] text-purple-300/80 block">User governance, room monitors, legal audio catalog</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </div>
        )}

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28]">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-[#A1A1AA]" />
            <span className="text-sm font-medium text-white">Notifications</span>
          </div>
          <button
            onClick={handleToggleNotifications}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${notifications ? 'bg-[#1ED760]' : 'bg-[#242836]'
              }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'
                }`}
            />
          </button>
        </div>

        {/* Server Connection */}
        <div
          onClick={() => {
            setServerUrlInput(getApiBaseUrl());
            setConnectionStatus(null);
            setShowServerModal(true);
          }}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28] cursor-pointer hover:bg-[#1B1E28] transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Server className="w-5 h-5 text-[#1ED760]" />
            <div>
              <span className="text-sm font-medium text-white block">Server Connection</span>
              <span className="text-[11px] text-[#71717A] truncate block max-w-[200px]">
                {getApiBaseUrl().replace('/api/v1', '')}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A]" />
        </div>

        {/* Data & Storage */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28] cursor-pointer hover:bg-[#1B1E28] transition-colors">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-[#A1A1AA]" />
            <span className="text-sm font-medium text-white">Data & Storage</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A]" />
        </div>

        {/* Playback */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28] cursor-pointer hover:bg-[#1B1E28] transition-colors">
          <div className="flex items-center space-x-3">
            <PlayCircle className="w-5 h-5 text-[#A1A1AA]" />
            <span className="text-sm font-medium text-white">Playback</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A]" />
        </div>

        {/* Appearance */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28] cursor-pointer hover:bg-[#1B1E28] transition-colors">
          <div className="flex items-center space-x-3">
            <Moon className="w-5 h-5 text-[#A1A1AA]" />
            <span className="text-sm font-medium text-white">Appearance</span>
          </div>
          <span className="text-xs text-[#A1A1AA]">Dark &gt;</span>
        </div>

        {/* Lock Screen & Notification Simulator */}
        <div
          onClick={onOpenLockScreenPreview}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28] cursor-pointer hover:bg-[#1B1E28] transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Smartphone className="w-5 h-5 text-[#1ED760]" />
            <span className="text-sm font-medium text-white">Lock-Screen Controls (Screen 10)</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A]" />
        </div>

        {/* Privacy & Security */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28] cursor-pointer hover:bg-[#1B1E28] transition-colors">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-[#A1A1AA]" />
            <span className="text-sm font-medium text-white">Privacy & Security</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A]" />
        </div>

        {/* Help & Support */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28] cursor-pointer hover:bg-[#1B1E28] transition-colors">
          <div className="flex items-center space-x-3">
            <HelpCircle className="w-5 h-5 text-[#A1A1AA]" />
            <span className="text-sm font-medium text-white">Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#71717A]" />
        </div>

        {/* About Paaaaaaatify */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#12141B]/60 border border-[#1B1E28] cursor-pointer hover:bg-[#1B1E28] transition-colors">
          <div className="flex items-center space-x-3">
            <Info className="w-5 h-5 text-[#A1A1AA]" />
            <span className="text-sm font-medium text-white">About Paaaaaaatify</span>
          </div>
          <span className="text-xs text-[#1ED760] font-bold">100% Free</span>
        </div>
      </div>

      {/* Log Out & Delete Account Buttons */}
      <div className="px-6 pt-6 pb-2 space-y-3">
        <button
          onClick={logout}
          className="w-full h-12 bg-transparent hover:bg-white/5 border border-[#242836] text-white font-bold rounded-full flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-lg"
        >
          <LogOut className="w-4 h-4 text-[#A1A1AA]" />
          <span>Log Out</span>
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full h-11 bg-transparent hover:bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold rounded-full flex items-center justify-center space-x-2 active:scale-95 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Account (Google Play / GDPR)</span>
        </button>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#12141B] border border-red-500/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-bold text-white text-base">Permanently Delete Account?</h3>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              This action is <strong className="text-red-400">permanent and irreversible</strong>. In compliance with Google Play Developer policies and GDPR:
            </p>
            <ul className="text-[11px] text-[#71717A] space-y-1 list-disc list-inside">
              <li>Your profile and login credentials will be removed.</li>
              <li>All your playlists and favorite tracks will be deleted.</li>
              <li>Your listening history will be completely erased.</li>
              <li>All active session tokens will be permanently revoked.</li>
            </ul>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#1B1E28] hover:bg-[#242836] text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeletingAccount(true);
                  try {
                    await deleteAccount();
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete account');
                    setDeletingAccount(false);
                  }
                }}
                disabled={deletingAccount}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center active:scale-95 transition-all"
              >
                {deletingAccount ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Server Configuration Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#12141B] border border-[#242836] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-[#1ED760]" />
                <h3 className="font-bold text-white text-base">Backend Server</h3>
              </div>
              <button
                onClick={() => setShowServerModal(false)}
                className="text-[#71717A] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Configure the production HTTPS API base URL used by Paaaaaaatify to connect to your backend server.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block">API Base URL</label>
              <input
                type="text"
                value={serverUrlInput}
                onChange={(e) => {
                  setServerUrlInput(e.target.value);
                  setConnectionStatus(null);
                }}
                placeholder="Enter your production HTTPS backend URL"
                className="w-full bg-[#08090D] border border-[#1B1E28] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
              />
            </div>

            {connectionStatus && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${connectionStatus.ok
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/60 border border-red-500/40 text-red-300'
                  }`}
              >
                {connectionStatus.ok ? (
                  <Check className="w-4 h-4 text-[#1ED760] flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span>{connectionStatus.message}</span>
              </div>
            )}

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#1B1E28] hover:bg-[#242836] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
              >
                {testingConnection ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1ED760]" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
              </button>
              <button
                onClick={handleSaveServerUrl}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#1ED760] hover:bg-[#1bc456] text-black text-xs font-bold flex items-center justify-center active:scale-95 transition-all"
              >
                Save & Apply
              </button>
            </div>

            <button
              onClick={handleResetServerUrl}
              className="w-full text-center text-[11px] text-[#71717A] hover:text-[#A1A1AA] pt-1"
            >
              Reset to Default URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

