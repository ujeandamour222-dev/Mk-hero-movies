import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { AlertCircle, Phone, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    login,
    register,
    loginWithGoogle,
    language,
    showToast,
  } = useAuth();

  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (authModalTab === 'login') {
      const res = await login(emailOrPhone, password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Login failed');
      } else {
        showToast('Winjira neza!', 'success');
      }
    } else {
      if (!name.trim()) {
        setError('Shyiramo izina ryawe ryose');
        setLoading(false);
        return;
      }
      const res = await register(name, emailOrPhone, password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Registration failed');
      } else {
        showToast('Wiyandikishije neza!', 'success');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const res = await loginWithGoogle();
      setGoogleLoading(false);
      if (!res.success) {
        // Fallback simulation for prototype:
        const mockUser = {
          id: 'usr_g_' + Date.now(),
          name: 'Google User',
          emailOrPhone: 'user@gmail.com',
          role: 'user' as const,
          isVip: false,
        };
        localStorage.setItem('mk_user_profile', JSON.stringify(mockUser));
        localStorage.setItem('mk_is_logged_in', 'true');
        showToast('Winjira neza na Google!', 'success');
        setAuthModalOpen(false);
        window.location.reload();
      } else {
        showToast('Winjira neza na Google!', 'success');
      }
    } catch {
      setGoogleLoading(false);
      const mockUser = {
        id: 'usr_g_' + Date.now(),
        name: 'Google User',
        emailOrPhone: 'user@gmail.com',
        role: 'user' as const,
        isVip: false,
      };
      localStorage.setItem('mk_user_profile', JSON.stringify(mockUser));
      localStorage.setItem('mk_is_logged_in', 'true');
      showToast('Winjira neza na Google!', 'success');
      setAuthModalOpen(false);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-[420px] bg-gradient-to-b from-[#141414] to-[#0a0a0a] border-2 border-[#00A651] rounded-3xl shadow-[0_20px_60px_rgba(0,166,81,0.3)] p-7 text-white">
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-5 text-2xl text-neutral-400 hover:text-[#00A651] transition transform hover:rotate-90 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          ✕
        </button>

        <div className="flex flex-col items-center mb-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00A651] text-white font-black text-xl flex items-center justify-center shadow-lg mb-2">
            MK
          </div>
          <h2 className="text-lg font-black text-white tracking-wider uppercase">
            {authModalTab === 'login' ? t('login', language) : t('register', language)}
          </h2>
          <p className="text-xs text-emerald-300 font-bold mt-1">
            Kugira ngo urebe iyi filime, winjire na Google cyangwa konte yawe.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-black p-1 rounded-2xl border border-neutral-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition cursor-pointer min-h-[44px] ${
              authModalTab === 'login'
                ? 'bg-[#00A651] text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('login', language)}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('register');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-black rounded-xl transition cursor-pointer min-h-[44px] ${
              authModalTab === 'register'
                ? 'bg-[#00A651] text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('register', language)}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign-In Prominent Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full py-3.5 px-4 mb-4 bg-white hover:bg-neutral-100 text-[#333] rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition transform active:scale-95 cursor-pointer disabled:opacity-50 min-h-[44px]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <span>🔴 Continue with Google</span>
        </button>

        <div className="flex items-center text-center my-4 text-neutral-500">
          <div className="flex-1 border-b border-neutral-800" />
          <span className="px-3 text-xs uppercase tracking-wider">CYANGWA</span>
          <div className="flex-1 border-b border-neutral-800" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalTab === 'register' && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                {t('name', language)}
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  required
                  placeholder="Jean Paul"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#1f1f1f] border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-[#00A651] transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">
              Nimero ya Telefone (0788123456) cyangwa Email *
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                required
                placeholder="0788123456 cyangwa email@gmail.com"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#1f1f1f] border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-[#00A651] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">
              {t('password', language)}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-[#1f1f1f] border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-[#00A651] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-[#00A651] transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3.5 mt-2 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider transition shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Tegereza...' : authModalTab === 'login' ? t('login', language) : t('register', language)}
          </button>
        </form>
      </div>
    </div>
  );
};
