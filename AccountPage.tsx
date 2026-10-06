import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Favorite, HistoryItem } from '../types';
import { User, Heart, Clock, Play, Shield, LogOut, Bookmark, Trash2 } from 'lucide-react';

export const AccountPage: React.FC = () => {
  const {
    user,
    language,
    setCurrentPage,
    setSelectedContentId,
    setSelectedContentType,
    logout,
    setAuthModalOpen,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'favorites' | 'history' | 'watchlist'>('watchlist');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('mk_user_watchlist');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleWatchlistUpdate = () => {
      try {
        const raw = localStorage.getItem('mk_user_watchlist');
        setWatchlist(raw ? JSON.parse(raw) : []);
      } catch {}
    };

    window.addEventListener('mk-watchlist-updated', handleWatchlistUpdate);
    return () => window.removeEventListener('mk-watchlist-updated', handleWatchlistUpdate);
  }, []);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setLoading(true);

    async function loadUserData() {
      if (!user?.id) return;
      try {
        const [favRes, histRes] = await Promise.all([
          fetch(`/api/favorites/${user.id}`),
          fetch(`/api/history/${user.id}`),
        ]);

        if (favRes.ok && histRes.ok) {
          const favData = await favRes.json();
          const histData = await histRes.json();
          if (isMounted) {
            setFavorites(favData.favorites || []);
            setHistory(histData.history || []);
          }
        }
      } catch (err) {
        console.error('Failed to load user account data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="py-16 px-4 max-w-md mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">Mubanze Mwinjire</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Injira muri konte yawe kugira ngo urebe afilime washyize muri Favorite no kureba izo waherukaga kureba.
          </p>
        </div>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 transition"
        >
          {t('login', language)} / {t('register', language)}
        </button>
      </div>
    );
  }

  const handlePlayFromItem = (contentId: string, contentType: 'movie' | 'series') => {
    setSelectedContentId(contentId);
    setSelectedContentType(contentType);
    setCurrentPage('watch');
  };

  return (
    <div className="pb-24 pt-4 space-y-8 max-w-5xl mx-auto">
      {/* Profile Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-yellow-500 p-0.5 shadow-lg shadow-red-600/30 shrink-0">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center font-black text-2xl text-red-500">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">{user.name}</h1>
                {user.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 font-extrabold text-[10px] border border-red-500/30">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">{user.emailOrPhone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-red-400 font-bold text-xs flex items-center gap-2 transition"
              title={t('logout', language)}
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sohoka (Logout)</span>
            </button>
          </div>
        </div>

        {/* Admin Dashboard Entry Point */}
        {user.role === 'admin' && (
          <div className="mt-5 pt-5 border-t border-neutral-800/80">
            <button
              onClick={() => setCurrentPage('admin')}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm shadow-xl active:scale-[0.99] transition transform"
            >
              <Shield className="w-5 h-5 fill-black/20 text-black" />
              <span>Fungura Admin Dashboard</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-neutral-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex items-center gap-2 py-3 px-6 font-extrabold text-sm border-b-2 shrink-0 transition cursor-pointer ${
            activeTab === 'watchlist'
              ? 'border-[#00A651] text-[#00A651]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Watchlist ({watchlist.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex items-center gap-2 py-3 px-6 font-extrabold text-sm border-b-2 shrink-0 transition cursor-pointer ${
            activeTab === 'favorites'
              ? 'border-red-600 text-red-500'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>{t('favorites', language)} ({favorites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 py-3 px-6 font-extrabold text-sm border-b-2 shrink-0 transition cursor-pointer ${
            activeTab === 'history'
              ? 'border-red-600 text-red-500'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('watchHistory', language)} ({history.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500">Gupakira ibyawe...</div>
      ) : activeTab === 'watchlist' ? (
        watchlist.length === 0 ? (
          <div className="p-16 text-center text-neutral-500 space-y-2">
            <Bookmark className="w-10 h-10 text-neutral-600 mx-auto" />
            <p className="font-bold text-sm text-neutral-300">Nta afilime ziri muri Watchlist yawe.</p>
            <p className="text-xs text-neutral-500">Kanda '+ Watchlist' kuri afilime ushaka kuzareba nyuma!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {watchlist.map((item) => (
              <div
                key={item.id}
                onClick={() => handlePlayFromItem(item.id, item.type || 'movie')}
                className="group relative rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden cursor-pointer hover:border-[#00A651] transition transform hover:-translate-y-1"
              >
                <div className="aspect-[2/3] bg-neutral-950 overflow-hidden relative">
                  <img
                    src={item.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play className="w-8 h-8 fill-white text-white" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const updated = watchlist.filter((w) => w.id !== item.id);
                      setWatchlist(updated);
                      localStorage.setItem('mk_user_watchlist', JSON.stringify(updated));
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-red-600 text-neutral-300 hover:text-white transition"
                    title="Siba muri Watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-xs text-white truncate group-hover:text-emerald-400 transition">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'favorites' ? (
        favorites.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">{t('noFavorites', language)}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                onClick={() => handlePlayFromItem(fav.contentId, fav.contentType)}
                className="group relative rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden cursor-pointer hover:border-red-600 transition"
              >
                <div className="aspect-[2/3] bg-neutral-950 overflow-hidden relative">
                  <img
                    src={fav.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                    alt={fav.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play className="w-8 h-8 fill-white text-white" />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-xs text-white truncate">{fav.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )
      ) : history.length === 0 ? (
        <div className="p-12 text-center text-neutral-500">{t('noHistory', language)}</div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => handlePlayFromItem(item.contentId, item.contentType)}
              className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-600/50 cursor-pointer transition"
            >
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={item.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200'}
                  alt={item.title}
                  className="w-16 aspect-video object-cover rounded-xl bg-neutral-950 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate">{item.title}</h4>
                  <div className="w-32 h-1.5 bg-neutral-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full"
                      style={{ width: `${Math.min(100, item.progress || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-400 shrink-0">
                <span>{item.progress}%</span>
                <Play className="w-4 h-4 text-red-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
