import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, Server, Check, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogleToken } from '../services/googleAuth';
import { getApiBaseUrl, setStoredApiUrl, resetStoredApiUrl, checkServerConnection, isBackendConfigured } from '../services/api';

export const AuthPage: React.FC = () => {
  const { login, register, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Server URL Configuration Modal
  const [showServerModal, setShowServerModal] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(getApiBaseUrl());
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, username, display_name: displayName });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await signInWithGoogleToken();
      await loginWithGoogle(idToken);
    } catch (e: any) {
      console.error('Google Auth Error:', e);
      setError(e.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };


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
      setError(null);
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

  return (
    <div className="fixed inset-0 z-40 bg-[#08090D] flex flex-col justify-between p-6 max-w-md mx-auto text-white overflow-y-auto">
      {/* Background Subtle Cyberpunk Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#1ED760]/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col items-center pt-8">
        <div className="w-20 h-20 mb-3 relative flex items-center justify-center animate-pulse-glow">
          <img src="/logo.svg" alt="P" className="w-full h-full drop-shadow-[0_0_20px_#1ED760]" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Paaaaaaatify
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Continue your music journey
        </p>

        {/* Server Connection Pill */}
        <button
          onClick={() => {
            setServerUrlInput(getApiBaseUrl());
            setConnectionStatus(null);
            setShowServerModal(true);
          }}
          className={`mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] transition-colors border ${isBackendConfigured()
            ? 'bg-[#12141B]/80 border-[#242836] text-[#A1A1AA] hover:text-[#1ED760] hover:border-[#1ED760]/40'
            : 'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:border-amber-400'
            }`}
        >
          <Server className={`w-3 h-3 ${isBackendConfigured() ? 'text-[#1ED760]' : 'text-amber-400'}`} />
          <span className="truncate max-w-[200px]">
            {getApiBaseUrl().replace('/api/v1', '') || 'Configure Server URL'}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 my-auto py-6">
        {!isBackendConfigured() && (
          <div
            onClick={() => {
              setServerUrlInput(getApiBaseUrl());
              setConnectionStatus(null);
              setShowServerModal(true);
            }}
            className="mb-4 p-3 bg-amber-950/40 border border-amber-500/50 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-950/60 transition-all text-xs text-amber-200"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Production backend not configured.</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-400 underline">Set Server URL</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl space-y-2 text-xs text-red-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
            </div>
            {(error.includes('Unable to connect') || error.includes('not configured')) && (
              <button
                onClick={() => {
                  setServerUrlInput(getApiBaseUrl());
                  setConnectionStatus(null);
                  setShowServerModal(true);
                }}
                className="w-full py-1.5 px-3 bg-red-900/40 hover:bg-red-800/60 border border-red-500/40 rounded-lg text-xs font-semibold text-white transition-colors"
              >
                Configure Server Connection
              </button>
            )}
          </div>
        )}

        {mode === 'welcome' && (
          <div className="space-y-3.5">
            {/* Continue with Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 bg-white hover:bg-gray-100 text-black font-semibold rounded-full flex items-center justify-center space-x-3 shadow-lg active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-[#1B1E28]" />
              <span className="px-3 text-xs text-[#71717A] lowercase">or</span>
              <div className="flex-1 border-t border-[#1B1E28]" />
            </div>

            {/* Sign in with Email */}
            <button
              onClick={() => setMode('login')}
              className="w-full h-12 bg-[#12141B] hover:bg-[#1B1E28] border border-[#242836] text-white font-medium rounded-full flex items-center justify-center space-x-2 active:scale-[0.98] transition-all"
            >
              <Mail className="w-4 h-4 text-[#A1A1AA]" />
              <span>Sign in with Email</span>
            </button>

            {/* Create Account */}
            <button
              onClick={() => setMode('register')}
              className="w-full h-12 bg-transparent hover:bg-white/5 border border-white/20 text-white font-medium rounded-full flex items-center justify-center active:scale-[0.98] transition-all"
            >
              <span>Create Account</span>
            </button>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#71717A] absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#12141B] border border-[#1B1E28] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#71717A] absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#12141B] border border-[#1B1E28] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1ED760] hover:bg-[#1bc456] text-black font-bold rounded-full flex items-center justify-center space-x-2 shadow-lg shadow-[#1ED760]/20 active:scale-[0.98] transition-all mt-6"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMode('welcome')}
              className="w-full text-xs text-[#A1A1AA] hover:text-white pt-2 text-center"
            >
              Back to options
            </button>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#71717A] absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cyber_listener"
                  className="w-full bg-[#12141B] border border-[#1B1E28] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Vance"
                className="w-full bg-[#12141B] border border-[#1B1E28] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#12141B] border border-[#1B1E28] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#12141B] border border-[#1B1E28] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#1ED760]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#1ED760] hover:bg-[#1bc456] text-black font-bold rounded-full flex items-center justify-center space-x-2 shadow-lg shadow-[#1ED760]/20 active:scale-[0.98] transition-all mt-4"
            >
              <span>{loading ? 'Creating...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMode('welcome')}
              className="w-full text-xs text-[#A1A1AA] hover:text-white pt-2 text-center"
            >
              Back to options
            </button>
          </form>
        )}
      </div>

      {/* Bottom Soundwave & Tagline strictly matching Screen 2 */}
      <div className="relative z-10 flex flex-col items-center pb-6">
        <div className="flex items-center space-x-1 mb-3">
          <span className="w-1 h-3 bg-purple-500 rounded-full animate-equalizer-1" />
          <span className="w-1 h-5 bg-purple-400 rounded-full animate-equalizer-3" />
          <span className="w-1 h-7 bg-purple-500 rounded-full animate-equalizer-2" />
          <span className="w-1 h-4 bg-purple-400 rounded-full animate-equalizer-4" />
          <span className="w-1 h-2 bg-purple-500 rounded-full animate-equalizer-1" />
        </div>
        <p className="text-xs text-[#71717A] font-medium tracking-wide">
          No Premium. No Limits. Just Music. 🎵
        </p>
      </div>

      {/* Server Configuration Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
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
              Configure the production HTTPS API URL for Paaaaaaatify backend services.
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
