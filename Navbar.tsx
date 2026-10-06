import React from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Search, LogOut, X, Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const Navbar: React.FC = () => {
  const {
    user,
    language,
    setLanguage,
    currentPage,
    setCurrentPage,
    logout,
    setAuthModalOpen,
    setAuthModalTab,
    openPaymentModal,
    searchQuery,
    setSearchQuery,
  } = useAuth();

  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleUserClick = () => {
    if (user) {
      setCurrentPage('account');
    } else {
      setAuthModalTab('login');
      setAuthModalOpen(true);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 0 && currentPage !== 'search') {
      setCurrentPage('search');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 'search') {
      setCurrentPage('search');
    }
  };

  const scrollToPricing = () => {
    if (currentPage !== 'home') {
      setCurrentPage('home');
      setTimeout(() => {
        const el = document.getElementById('pricingSection');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } else {
      const el = document.getElementById('pricingSection');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        openPaymentModal(500, 'Icyumweru', 7);
      }
    }
  };

  return (
    <header className="sticky top-0 z-[100] bg-[#0b0b0b]/98 border-b-2 border-[#00A651] px-3 sm:px-8 py-3 flex items-center justify-between gap-3 shadow-xl font-sans select-none">
      {/* Header Logo Container */}
      <div
        onClick={() => setCurrentPage('home')}
        className="flex items-center justify-center cursor-pointer group shrink-0"
      >
        <img
          src="/logo-header.png"
          alt="MK HERO MOVIES Logo"
          className="h-10 w-auto object-contain transition transform group-hover:scale-105"
        />
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden lg:flex items-center gap-5 text-xs font-bold tracking-wide">
        <button
          onClick={() => setCurrentPage('home')}
          className={`transition-colors cursor-pointer ${
            currentPage === 'home' ? 'text-[#00A651]' : 'text-neutral-300 hover:text-[#00A651]'
          }`}
        >
          {t('home', language)}
        </button>

        <button
          onClick={() => setCurrentPage('movies')}
          className={`transition-colors cursor-pointer ${
            currentPage === 'movies' ? 'text-[#00A651]' : 'text-neutral-300 hover:text-[#00A651]'
          }`}
        >
          {t('movies', language)}
        </button>

        <button
          onClick={() => setCurrentPage('series')}
          className={`transition-colors cursor-pointer ${
            currentPage === 'series' ? 'text-[#00A651]' : 'text-neutral-300 hover:text-[#00A651]'
          }`}
        >
          {t('series', language)}
        </button>

        <button
          onClick={() => setCurrentPage('categories')}
          className={`transition-colors cursor-pointer ${
            currentPage === 'categories' ? 'text-[#00A651]' : 'text-neutral-300 hover:text-[#00A651]'
          }`}
        >
          {t('categories', language)}
        </button>

        <button
          onClick={() => setCurrentPage('contact')}
          className={`transition-colors cursor-pointer ${
            currentPage === 'contact' ? 'text-[#00A651]' : 'text-neutral-300 hover:text-[#00A651]'
          }`}
        >
          {t('contact', language)}
        </button>
      </nav>

      {/* SEARCH INPUT FIELD IN HEADER */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs sm:max-w-sm">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Shakisha filime (Search movie)..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-8 py-2 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-xs font-semibold text-white placeholder-neutral-500 outline-none focus:border-[#00A651] focus:ring-1 focus:ring-[#00A651] transition shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
              }}
              className="absolute right-2.5 p-1 rounded-full text-neutral-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {/* Header Icons & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* PWA Install Button Header Shortcut */}
        {!isInstalled && isInstallable && (
          <button
            onClick={install}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#00A651] to-emerald-600 hover:from-emerald-500 hover:to-[#00A651] text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition transform hover:scale-105 cursor-pointer min-h-[40px]"
            title="Install MK HERO MOVIES App"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>Install App</span>
          </button>
        )}

        {/* Payment Shortcut Button */}
        <button
          onClick={scrollToPricing}
          className="w-10 h-10 rounded-full bg-[#222] hover:bg-[#00A651] text-white text-base flex items-center justify-center transition transform hover:scale-105 cursor-pointer shadow min-w-[44px] min-h-[44px]"
          title="Ishyura (Payment)"
        >
          💳
        </button>

        {/* Language Toggle */}
        <button
          onClick={() => setLanguage(language === 'rw' ? 'en' : 'rw')}
          className="w-10 h-10 rounded-full bg-[#222] hover:bg-neutral-800 border border-neutral-700 text-xs font-bold text-yellow-400 flex items-center justify-center transition cursor-pointer min-w-[44px] min-h-[44px]"
          title="Switch Language"
        >
          {language.toUpperCase()}
        </button>

        {/* User Icon Avatar */}
        <button
          onClick={handleUserClick}
          title={user ? user.name : 'Sign In'}
          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition transform hover:scale-105 cursor-pointer min-w-[44px] min-h-[44px] ${
            user
              ? 'bg-[#00A651] border-[#00A651] text-white shadow-[0_0_15px_rgba(0,166,81,0.4)]'
              : 'bg-[#333] border-[#444] text-white hover:bg-[#00A651] hover:border-[#00A651]'
          }`}
        >
          {user ? user.name.charAt(0).toUpperCase() : '👤'}
        </button>

        {user && (
          <button
            onClick={logout}
            className="w-10 h-10 rounded-full bg-[#222] hover:bg-[#00A651] text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer min-w-[44px] min-h-[44px]"
            title={t('logout', language)}
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
