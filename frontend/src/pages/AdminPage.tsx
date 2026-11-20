import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Users, Server, Radio, Shield, ListMusic, RefreshCw, CheckCircle,
  AlertTriangle, Power, Database, Activity, FileText, ToggleLeft, ToggleRight
} from 'lucide-react';
import { api } from '../services/api';

interface AdminPageProps {
  onBack: () => void;
}

type AdminTab = 'overview' | 'users' | 'rooms' | 'providers' | 'logs';

export const AdminPage: React.FC<AdminPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [healthData, setHealthData] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [providersList, setProvidersList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchUser, setSearchUser] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [h, u, r, p, l] = await Promise.all([
        api.admin.getHealth().catch(() => null),
        api.admin.getUsers().catch(() => []),
        api.admin.getRooms().catch(() => []),
        api.admin.getProviders().catch(() => []),
        api.admin.getLogs().catch(() => [])
      ]);
      setHealthData(h);
      setUsersList(u);
      setRoomsList(r);
      setProvidersList(p);
      setLogsList(l);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUserStatus = async (userId: string, currentActive: boolean) => {
    try {
      await api.admin.updateUserStatus(userId, { is_active: !currentActive });
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u))
      );
      setActionMessage(`User account status updated.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleToggleProvider = async (providerId: string, currentEnabled: boolean) => {
    try {
      await api.admin.toggleProvider(providerId, !currentEnabled);
      setProvidersList((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, is_enabled: !currentEnabled } : p))
      );
      setActionMessage(`Provider status updated.`);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update provider');
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.display_name && u.display_name.toLowerCase().includes(searchUser.toLowerCase()))
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#08090D] pb-36 text-white max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 border-b border-[#1B1E28]">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="p-2 -ml-2 text-[#A1A1AA] hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Admin Operations</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#1ED760]/20 text-[#1ED760] font-mono border border-[#1ED760]/40">
                PROD-AUDIT
              </span>
            </h2>
            <p className="text-xs text-[#71717A]">Multi-User & System Governance</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="p-2 text-[#71717A] hover:text-white active:scale-95 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#1ED760]' : ''}`} />
        </button>
      </div>

      {actionMessage && (
        <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-[#1ED760]" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-1 px-6 pt-4 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'users', label: `Users (${usersList.length})`, icon: Users },
          { id: 'rooms', label: `Rooms (${roomsList.length})`, icon: Radio },
          { id: 'providers', label: 'Audio Sources', icon: ListMusic },
          { id: 'logs', label: 'Audit Logs', icon: FileText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#1ED760] text-black shadow-lg shadow-[#1ED760]/20'
                  : 'bg-[#12141B] text-[#A1A1AA] hover:text-white border border-[#1B1E28]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="px-6 pt-4 flex-1 space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-[#12141B] border border-[#1B1E28]">
                <p className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider">Registered Users</p>
                <p className="text-2xl font-black text-white mt-1">
                  {healthData?.metrics?.total_users ?? usersList.length}
                </p>
                <p className="text-[10px] text-[#1ED760] mt-1">
                  {healthData?.metrics?.active_users ?? usersList.filter(u => u.is_active).length} Active Accounts
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#12141B] border border-[#1B1E28]">
                <p className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider">Active Rooms</p>
                <p className="text-2xl font-black text-white mt-1">
                  {healthData?.metrics?.active_rooms ?? roomsList.length}
                </p>
                <p className="text-[10px] text-purple-400 mt-1">Real-time WebSocket Sync</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#12141B] border border-[#1B1E28]">
                <p className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider">Curated Audio Library</p>
                <p className="text-2xl font-black text-white mt-1">
                  {healthData?.metrics?.active_songs ?? 9}
                </p>
                <p className="text-[10px] text-blue-400 mt-1">100% Legally Licensed</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#12141B] border border-[#1B1E28]">
                <p className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider">Database Storage</p>
                <p className="text-2xl font-black text-white mt-1">
                  {healthData?.database?.size_kb ? `${healthData.database.size_kb} KB` : '176 KB'}
                </p>
                <p className="text-[10px] text-[#A1A1AA] mt-1">{healthData?.database?.type || 'SQLite Persisted'}</p>
              </div>
            </div>

            {/* Copyright & Legal Compliance Card */}
            <div className="p-4 rounded-2xl bg-[#12141B] border border-emerald-500/30">
              <div className="flex items-center space-x-2 text-[#1ED760] font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>Zero Copyright Infringement Policy</span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">
                PAAAAAAATIFY operates exclusively with legally authorized audio: SoundHelix algorithmic streams, Jamendo Creative Commons music, Free Music Archive, and direct user-owned file uploads. No scraping of proprietary services (Spotify, YouTube) is permitted.
              </p>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Search users by name, email, or handle..."
              className="w-full bg-[#12141B] border border-[#1B1E28] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
            />

            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-[#12141B] border border-[#1B1E28] flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <img
                      src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={u.username}
                      className="w-10 h-10 rounded-full object-cover border border-purple-500/30"
                    />
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {u.display_name || u.username}
                        </span>
                        {u.is_admin && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                            ADMIN
                          </span>
                        )}
                        {!u.is_active && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
                            DISABLED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#71717A] truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center space-x-1 transition-all ${
                        u.is_active
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{u.is_active ? 'Disable' : 'Enable'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROOMS TAB */}
        {activeTab === 'rooms' && (
          <div className="space-y-3">
            {roomsList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#12141B] border border-[#1B1E28]">
                <Radio className="w-8 h-8 text-[#71717A] mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-[#A1A1AA]">No Active Group Rooms</p>
                <p className="text-xs text-[#71717A] mt-1">When users start a group party, it will show up here.</p>
              </div>
            ) : (
              roomsList.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl bg-[#12141B] border border-[#1B1E28] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{r.name}</span>
                      <span className="text-[10px] text-[#1ED760] font-mono">Code: {r.code}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                      {r.participants_count} in room
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#A1A1AA] pt-1 border-t border-[#1B1E28]">
                    <span>Host: @{r.host_username}</span>
                    <span>State: <strong className="text-white">{r.playback_state}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PROVIDERS TAB */}
        {activeTab === 'providers' && (
          <div className="space-y-3">
            <p className="text-xs text-[#A1A1AA]">
              Manage authorized, legal audio streaming sources. All providers strictly adhere to copyright licenses.
            </p>
            {providersList.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-2xl bg-[#12141B] border border-[#1B1E28] flex items-center justify-between"
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-white">{p.name}</h4>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1ED760]/10 text-[#1ED760] font-mono">
                      {p.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717A] mt-1 leading-relaxed">{p.description}</p>
                </div>
                <button
                  onClick={() => handleToggleProvider(p.id, p.is_enabled)}
                  className="p-2 text-[#1ED760] hover:opacity-80 transition-opacity"
                >
                  {p.is_enabled ? (
                    <ToggleRight className="w-7 h-7 text-[#1ED760]" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-[#71717A]" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-2 font-mono text-[11px]">
            {logsList.map((log, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#12141B] border border-[#1B1E28] space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${log.level === 'AUDIT' ? 'text-purple-400' : 'text-[#1ED760]'}`}>
                    [{log.action}]
                  </span>
                  <span className="text-[9px] text-[#71717A]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-[#A1A1AA] text-xs">{log.details}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

