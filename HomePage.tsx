import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Movie, Series, Category, HistoryItem } from '../types';
import { MovieDetailsModal } from '../components/MovieDetailsModal';
import { BannerAd } from '../components/BannerAd';
import { Play, Info, Film, Tv, Flame, Star, Grid, Search, ArrowRight, Clock, Bookmark, BookmarkCheck } from 'lucide-react';

export const HomePage: React.FC = () => {
  const {
    language,
    setCurrentPage,
    setSelectedContentId,
    setSelectedContentType,
    setActiveEpisodeId,
    setSelectedCategorySlug,
    searchQuery,
    setSearchQuery,
    user,
    openPaymentModal,
    setAuthModalOpen,
    watchlist,
    toggleWatchlist,
    isInWatchlist,
  } = useAuth();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalContentId, setModalContentId] = useState<string | null>(null);
  const [modalContentType, setModalContentType] = useState<'movie' | 'series' | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadContent() {
      try {
        const [movRes, serRes, catRes, planRes] = await Promise.all([
          fetch('/api/movies'),
          fetch('/api/series'),
          fetch('/api/categories'),
          fetch('/api/plans'),
        ]);

        const parseJson = async (res: Response) => {
          try {
            return await res.json();
          } catch {
            return {};
          }
        };

        const movData = movRes.ok ? await parseJson(movRes) : {};
        const serData = serRes.ok ? await parseJson(serRes) : {};
        const catData = catRes.ok ? await parseJson(catRes) : {};
        const planData = planRes.ok ? await parseJson(planRes) : {};

        if (isMounted) {
          setMovies(movData.movies || []);
          setSeries(serData.series || []);
          setCategories(catData.categories || []);
          setPlans(planData.plans || [
            { id: '1', name: 'Umunsi Umo', price: 300, durationDays: 1, featured: false, features: ["Filme z'umunsi umwe", "HD Quality", "Nta Ads"] },
            { id: '2', name: 'Icyumweru', price: 500, durationDays: 7, featured: true, features: ["Filme z'icyumweru cyose", "Full HD Quality", "Download 5", "Priority Support"] },
            { id: '3', name: 'Ibyumweru 2', price: 3000, durationDays: 14, featured: false, features: ["Access y'ibyumweru 2", "4K Quality", "Download zose", "24/7 Support"] },
          ]);
        }
      } catch (err) {
        console.error('Failed to load homepage content:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadContent();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Continue Watching history from Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      let list: HistoryItem[] = [];

      if (user?.id) {
        try {
          const res = await fetch(`/api/history/${user.id}`);
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            list = data.history || [];
          }
        } catch (e) {
          console.warn('History fetch error:', e);
        }
      }

      // Check local storage fallback for guest or instant sync
      if (list.length === 0) {
        try {
          const raw = localStorage.getItem('mk_guest_history');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) list = parsed;
          }
        } catch {}
      }

      const filtered = list.filter((h) => (h.progress || 0) > 0 && (h.progress || 0) < 98);
      if (isMounted) {
        setContinueWatching(filtered.slice(0, 10));
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const featuredItem = movies.find((m) => m.featured) || movies[0] || series[0] || null;
  const featuredMovies = movies.filter((m) => m.featured || m.trending);
  const latestMovies = [...movies].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 10);
  const trendingMovies = movies.filter((m) => m.trending || (m.views || 0) > 10).slice(0, 10);
  const latestSeries = [...series].slice(0, 10);

  const openDetails = (id: string, type: 'movie' | 'series') => {
    setModalContentId(id);
    setModalContentType(type);
  };

  const startPlaying = (id: string, type: 'movie' | 'series', episodeId?: string) => {
    const isLoggedIn = !!user || localStorage.getItem('mk_is_logged_in') === 'true' || !!localStorage.getItem('mk_user_profile');
    if (!isLoggedIn) {
      setAuthModalOpen(true);
      return;
    }
    setSelectedContentId(id);
    setSelectedContentType(type);
    if (episodeId) setActiveEpisodeId(episodeId);
    else setActiveEpisodeId(null);
    setModalContentId(null);
    setCurrentPage('watch');
  };

  const handleContinueWatchingClick = (item: HistoryItem) => {
    setSelectedContentId(item.contentId);
    setSelectedContentType(item.contentType);
    if (item.contentType === 'series') {
      setActiveEpisodeId(item.contentId);
    } else {
      setActiveEpisodeId(null);
    }
    setCurrentPage('watch');
  };

  const handleCategoryClick = (slug: string) => {
    setSelectedCategorySlug(slug);
    setCurrentPage('categories');
  };

  return (
    <div className="pb-24 pt-2 space-y-12 min-h-screen">
      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-10 animate-pulse">
          <div className="w-full h-[65vh] max-h-[580px] bg-neutral-900 rounded-3xl" />
          <div className="space-y-4">
            <div className="h-6 w-40 bg-neutral-900 rounded-lg" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* HEADER BANNER AD SLOT */}
          <BannerAd position="header" />

          {/* PROMINENT TOP SEARCH BAR & CATEGORY FILTER BAR */}
          <div className="p-4 sm:p-6 rounded-3xl bg-neutral-900/90 border-2 border-emerald-500/40 shadow-2xl space-y-3 font-sans">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) setCurrentPage('search');
              }}
              className="relative w-full"
            >
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-[#00A651] absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim().length > 0 && searchQuery !== e.target.value) {
                      setCurrentPage('search');
                    }
                  }}
                  placeholder="Shakisha afilime cyangwa icyiciro (Search movie title or category)..."
                  className="w-full pl-12 pr-12 py-3.5 sm:py-4 rounded-2xl bg-black border border-emerald-500/50 text-white font-bold text-xs sm:text-sm placeholder-neutral-400 outline-none focus:border-[#00A651] focus:ring-2 focus:ring-[#00A651]/50 shadow-inner transition"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="absolute right-2 px-4 py-2 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Shakisha
                  </button>
                )}
              </div>
            </form>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
              <span className="text-neutral-400 text-[10px] uppercase font-mono shrink-0">Ibyiciro:</span>
              {[
                { name: 'Byose (All)', slug: '' },
                { name: 'Agasobanuye Action', slug: 'Agasobanuye Action' },
                { name: 'Agasobanuye Drama', slug: 'Agasobanuye Drama' },
                { name: 'Rwandan Local Films', slug: 'Rwandan Local Films' },
                { name: 'Series', slug: 'series' },
                { name: 'Comedy', slug: 'Comedy' },
                { name: 'Romance', slug: 'Romance' },
              ].map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    if (c.slug === 'series') {
                      setCurrentPage('series');
                    } else if (c.slug) {
                      setSearchQuery(c.slug);
                      setCurrentPage('search');
                    } else {
                      setSearchQuery('');
                      setCurrentPage('movies');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-black/60 hover:bg-[#00A651] border border-emerald-500/30 text-neutral-200 hover:text-white shrink-0 transition cursor-pointer shadow-sm"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* 1. HERO BANNER */}
          {featuredItem ? (
            <div className="relative w-full h-[50vh] sm:h-[60vh] max-h-[500px] bg-[#16213e] rounded-2xl overflow-hidden border-2 border-[#333] flex items-end p-6 sm:p-10 shadow-2xl">
              <img
                src={featuredItem.backdropUrl || featuredItem.posterUrl || 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1200'}
                alt={featuredItem.title}
                loading="eager"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-40 filter brightness-90 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/60 to-transparent" />

              <div className="relative z-10 max-w-2xl space-y-3">
                <span className="inline-block bg-[#00A651] text-white text-xs font-bold px-3 py-1 rounded tracking-wider uppercase shadow-md">
                  ICYARARIWE CYANE
                </span>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight drop-shadow-md">
                  {featuredItem.title}
                </h1>

                <p className="text-neutral-300 text-xs sm:text-sm line-clamp-2 max-w-xl">
                  {featuredItem.description || 'Reba filme zigezweho mu Kinyarwanda ku MK HERO MOVIES.'}
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => startPlaying(featuredItem.id, 'videoUrl' in featuredItem ? 'movie' : 'series')}
                    className="px-6 py-3 bg-[#00A651] hover:bg-[#008f45] text-white font-extrabold text-sm rounded-lg transition shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <span>▶ Reba Now</span>
                  </button>

                  <button
                    onClick={() => openDetails(featuredItem.id, 'videoUrl' in featuredItem ? 'movie' : 'series')}
                    className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-lg backdrop-blur-md transition cursor-pointer"
                  >
                    + Watch Later
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* 1.5 CONTINUE WATCHING SECTION */}
          {continueWatching.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Clock className="w-6 h-6 text-[#00A651] animate-pulse" />
                  <span>{t('continueWatching', language)}</span>
                </h2>
                <span className="text-xs font-bold text-neutral-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800 font-mono">
                  {continueWatching.length} film zitarangira
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {continueWatching.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleContinueWatchingClick(item)}
                    className="group relative rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden cursor-pointer transition transform hover:-translate-y-1.5 hover:shadow-2xl hover:border-[#00A651]/50"
                  >
                    <div className="aspect-[2/3] w-full bg-neutral-950 overflow-hidden relative">
                      <img
                        src={item.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                      />

                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition flex flex-col items-center justify-center p-3">
                        <div className="w-12 h-12 rounded-full bg-[#00A651] text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-110 transition">
                          <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-wider mt-2 bg-black/70 px-2.5 py-0.5 rounded-full border border-white/20">
                          KOMEZA
                        </span>
                      </div>

                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-white font-bold text-[10px] tracking-wide backdrop-blur-md">
                        {item.contentType === 'series' ? 'SERIES' : 'MOVIE'}
                      </div>

                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#00A651] text-white font-mono font-black text-[10px] shadow-lg">
                        {Math.round(item.progress)}%
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 h-2 bg-neutral-900/90 z-20">
                        <div
                          className="h-full bg-gradient-to-r from-[#00A651] via-emerald-400 to-yellow-400 rounded-r-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(3, item.progress))}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 space-y-1">
                      <h3 className="font-extrabold text-sm text-white truncate group-hover:text-emerald-400 transition">
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                        <span className="text-yellow-400 font-bold">{Math.round(item.progress)}% Byarangiye</span>
                        <span>{item.contentType === 'series' ? 'Igice' : 'Film'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 1.6 MY LIST / WATCHLIST SECTION */}
          {watchlist.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Bookmark className="w-6 h-6 text-[#00A651] fill-[#00A651]" />
                  <span>IBYO NSHIMISHIJE (MY LIST)</span>
                </h2>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 font-mono">
                  📌 {watchlist.length} zibitswe
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {movies
                  .filter((m) => isInWatchlist(m.id))
                  .map((m) => (
                    <ContentCard
                      key={'wl_' + m.id}
                      item={m}
                      type="movie"
                      onClick={() => openDetails(m.id, 'movie')}
                    />
                  ))}
                {series
                  .filter((s) => isInWatchlist(s.id))
                  .map((s) => (
                    <ContentCard
                      key={'wl_' + s.id}
                      item={s}
                      type="series"
                      onClick={() => openDetails(s.id, 'series')}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* 2. FEATURED MOVIES CAROUSEL */}
          {featuredMovies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-6 rounded-full bg-[#00A651]" />
                  <span>{t('featured', language)}</span>
                </h2>
                <button
                  onClick={() => setCurrentPage('movies')}
                  className="text-xs font-bold text-[#00A651] hover:text-emerald-400 flex items-center gap-1 transition"
                >
                  <span>Reba Zose (View All)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {featuredMovies.map((m) => (
                  <ContentCard
                    key={m.id}
                    item={m}
                    type="movie"
                    onClick={() => openDetails(m.id, 'movie')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. LATEST MOVIES */}
          {latestMovies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-6 rounded-full bg-yellow-500" />
                  <span>{t('latestMovies', language)}</span>
                </h2>
                <button
                  onClick={() => setCurrentPage('movies')}
                  className="text-xs font-bold text-yellow-500 hover:text-yellow-400 flex items-center gap-1 transition"
                >
                  <span>Reba Zose (View All)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {latestMovies.map((m) => (
                  <ContentCard
                    key={m.id}
                    item={m}
                    type="movie"
                    onClick={() => openDetails(m.id, 'movie')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 4. TRENDING MOVIES */}
          {trendingMovies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-6 rounded-full bg-emerald-500" />
                  <span>{t('trending', language)}</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {trendingMovies.map((m) => (
                  <ContentCard
                    key={m.id}
                    item={m}
                    type="movie"
                    onClick={() => openDetails(m.id, 'movie')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 5. LATEST SERIES */}
          {latestSeries.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-6 rounded-full bg-purple-600" />
                  <span>{t('latestSeries', language)}</span>
                </h2>
                <button
                  onClick={() => setCurrentPage('series')}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
                >
                  <span>Reba Zose (View All)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {latestSeries.map((s) => (
                  <ContentCard
                    key={s.id}
                    item={s}
                    type="series"
                    onClick={() => openDetails(s.id, 'series')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 6. CATEGORIES GRID */}
          {categories.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-neutral-800/80">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <Grid className="w-6 h-6 text-[#00A651]" />
                  <span>{t('categories', language)}</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-[#00A651]/50 hover:bg-neutral-800 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition">
                        {cat.name}
                      </h4>
                      <p className="text-[11px] text-neutral-400 line-clamp-1">
                        {cat.description || 'Explore films'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-[#00A651] group-hover:translate-x-1 transition transform" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 7. PRICING SECTION */}
          <section className="py-8 px-2 sm:px-4 my-8" id="pricingSection">
            <h2 className="text-center font-black text-2xl sm:text-3xl uppercase tracking-widest mb-8 text-white">
              HITAMO <span className="text-[#00A651]">PLAN</span> USHAKA
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan: any) => (
                <div
                  key={plan.id}
                  className={`relative bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border-2 rounded-2xl p-7 text-center transition duration-300 overflow-hidden hover:-translate-y-1.5 ${
                    plan.featured
                      ? 'border-[#00A651] shadow-[0_10px_30px_rgba(0,166,81,0.3)]'
                      : 'border-[#333] hover:border-[#00A651]'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute top-4 -right-9 bg-[#00A651] text-white py-1 px-10 rotate-45 text-[10px] font-black uppercase tracking-wider shadow">
                      IBIKUNZWE
                    </div>
                  )}

                  <h3 className="text-[#00A651] text-xl font-extrabold mb-3">{plan.name}</h3>

                  <div className="text-4xl font-black text-white mb-2">
                    {plan.price} <span className="text-sm font-bold text-neutral-500">RWF</span>
                  </div>

                  <ul className="my-6 space-y-3 text-left">
                    {(plan.features || ["Filme z'umunsi umwe", "HD Quality", "Nta Ads"]).map((feat: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-neutral-300 font-medium">
                        <span className="text-[#00A651] font-bold text-base shrink-0">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => openPaymentModal(plan.price, plan.name, plan.durationDays || 7)}
                    className="w-full py-4 bg-[#00A651] hover:bg-[#008f45] text-white rounded-lg text-sm font-extrabold uppercase tracking-wider cursor-pointer transition shadow-[0_5px_20px_rgba(0,166,81,0.4)] active:scale-95"
                  >
                    Ishyura Nonaha
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 📌 MY LIST / IBYO NSHIMISHEJE SECTION AT THE BOTTOM */}
          {(() => {
            const allItems = [...movies, ...series];
            const savedItems = allItems.filter((i) => watchlist.includes(i.id));
            if (savedItems.length === 0) return null;

            return (
              <section className="space-y-4 pt-8 border-t border-neutral-800 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-2xl bg-[#00A651]/20 text-[#00A651] border border-[#00A651]/40 font-bold">
                      <BookmarkCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 uppercase tracking-wider">
                        <span>📌 MY LIST (IBYO NSHIMISHEJE)</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#00A651] text-white text-xs font-mono font-black">
                          {savedItems.length}
                        </span>
                      </h2>
                      <p className="text-xs text-neutral-400">Filime watoranyije zibitswe mu bubiko bwawe bwa hafi.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {savedItems.map((m) => (
                    <ContentCard
                      key={m.id}
                      item={m}
                      type={'servers' in m ? 'movie' : 'series'}
                      onClick={() => {
                        setModalContentId(m.id);
                        setModalContentType('servers' in m ? 'movie' : 'series');
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })()}
        </>
      )}

      {/* Movie/Series Details Modal */}
      <MovieDetailsModal
        contentId={modalContentId}
        contentType={modalContentType}
        onClose={() => setModalContentId(null)}
        onPlay={startPlaying}
      />
    </div>
  );
};

interface ContentCardProps {
  item: Movie | Series;
  type: 'movie' | 'series';
  onClick: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ item, type, onClick }) => {
  const { toggleWatchlist, isInWatchlist } = useAuth();
  const bookmarked = isInWatchlist(item.id);

  return (
    <div
      onClick={onClick}
      className="group relative rounded-xl bg-[#1a1a1a] border-2 border-transparent overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:border-[#00A651] hover:shadow-[0_10px_30px_rgba(0,166,81,0.3)]"
    >
      <div className="aspect-[2/3] w-full bg-[#2a2a2a] overflow-hidden relative flex items-center justify-center">
        <img
          src={item.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />

        {/* Watchlist Bookmark Icon Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWatchlist(item.id);
          }}
          className={`absolute top-2 right-2 z-20 p-2 rounded-full backdrop-blur-md transition shadow-lg cursor-pointer ${
            bookmarked
              ? 'bg-[#00A651] text-white border border-emerald-300'
              : 'bg-black/60 text-neutral-300 hover:text-white hover:bg-black/90 border border-white/20'
          }`}
          title={bookmarked ? 'Siba muri My List' : 'Shyira muri My List'}
        >
          {bookmarked ? (
            <BookmarkCheck className="w-4 h-4 fill-white text-white" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>

        {/* MK Corner Badge Overlay */}
        <div className="absolute bottom-2 right-2 bg-[#00A651]/90 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-wider shadow">
          MK
        </div>

        {/* Hover play icon overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#00A651] flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition">
            <Play className="w-6 h-6 fill-white text-white ml-0.5" />
          </div>
        </div>

        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-white font-bold text-[10px] tracking-wide">
          {type === 'series' ? 'SERIES' : (item.genre || item.category || 'MOVIE')}
        </div>

        {item.year && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-md text-yellow-400 font-mono font-bold text-[10px]">
            {item.year}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1">
        <h3 className="font-bold text-sm text-white truncate group-hover:text-[#00A651] transition">
          {item.title}
        </h3>
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span>{item.language || 'Kinyarwanda'}</span>
          <span>{item.views || 0} views</span>
        </div>
      </div>
    </div>
  );
};
