import React from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Home, Search, Grid, Film, Tv, User, Shield } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentPage, setCurrentPage, language, user, setAuthModalOpen } = useAuth();

  const handleAccountClick = () => {
    if (user) {
      setCurrentPage('account');
    } else {
      setAuthModalOpen(true);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-emerald-900/40 px-1 py-1.5 flex items-center justify-between select-none">
      <button
        onClick={() => setCurrentPage('home')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition cursor-pointer min-h-[44px] ${
          currentPage === 'home' ? 'text-[#00A651] font-extrabold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[9px] tracking-tighter truncate w-full text-center">{t('home', language)}</span>
      </button>

      <button
        onClick={() => setCurrentPage('movies')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition cursor-pointer min-h-[44px] ${
          currentPage === 'movies' ? 'text-[#00A651] font-extrabold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Film className="w-5 h-5" />
        <span className="text-[9px] tracking-tighter truncate w-full text-center">{t('movies', language)}</span>
      </button>

      <button
        onClick={() => setCurrentPage('series')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition cursor-pointer min-h-[44px] ${
          currentPage === 'series' ? 'text-[#00A651] font-extrabold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Tv className="w-5 h-5" />
        <span className="text-[9px] tracking-tighter truncate w-full text-center">{t('series', language)}</span>
      </button>

      <button
        onClick={() => setCurrentPage('categories')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition cursor-pointer min-h-[44px] ${
          currentPage === 'categories' ? 'text-[#00A651] font-extrabold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Grid className="w-5 h-5" />
        <span className="text-[9px] tracking-tighter truncate w-full text-center">{t('categories', language)}</span>
      </button>

      <button
        onClick={() => setCurrentPage('search')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition cursor-pointer min-h-[44px] ${
          currentPage === 'search' ? 'text-[#00A651] font-extrabold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-[9px] tracking-tighter truncate w-full text-center">{t('search', language)}</span>
      </button>

      {isAdmin && (
        <button
          onClick={() => setCurrentPage('admin')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition cursor-pointer min-h-[44px] ${
            currentPage === 'admin' ? 'text-amber-400 font-black' : 'text-amber-500/80 hover:text-amber-400'
          }`}
        >
          <div className="p-1 rounded-lg bg-amber-500/20 border border-amber-500/40">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-[8.5px] font-bold text-amber-400 tracking-tighter truncate w-full text-center">Admin</span>
        </button>
      )}

      <button
        onClick={handleAccountClick}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-1 transition cursor-pointer min-h-[44px] ${
          currentPage === 'account' ? 'text-[#00A651] font-extrabold' : 'text-neutral-400 hover:text-white'
        }`}
      >
        <User className="w-5 h-5" />
        <span className="text-[9px] tracking-tighter truncate w-full text-center">{t('account', language)}</span>
      </button>
    </div>
  );
};
