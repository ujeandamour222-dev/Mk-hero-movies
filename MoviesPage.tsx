import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Movie } from '../types';
import { MovieDetailsModal } from '../components/MovieDetailsModal';
import { Film, Search, Filter, Play } from 'lucide-react';

export const MoviesPage: React.FC = () => {
  const { language, setCurrentPage, setSelectedContentId, setSelectedContentType, setActiveEpisodeId, user, setAuthModalOpen } = useAuth();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');

  const [modalContentId, setModalContentId] = useState<string | null>(null);

  useEffect(() => {
    async function loadMovies() {
      try {
        const res = await fetch('/api/movies');
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setMovies(data.movies || []);
        }
      } catch (err) {
        console.error('Failed to load movies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMovies();
  }, []);

  const genres = ['all', ...Array.from(new Set(movies.map((m) => m.genre || m.category || 'Action')))];

  const filteredMovies = movies.filter((m) => {
    // Filter out draft items unless admin
    if (m.status === 'draft' && user?.role !== 'admin') return false;

    const matchesSearch = (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
                          (m.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || (m.genre || m.category) === selectedGenre;
    return matchesSearch && matchesGenre;
  });

  const openDetails = (id: string) => {
    setModalContentId(id);
  };

  const startPlaying = (id: string) => {
    const isLoggedIn = !!user || localStorage.getItem('mk_is_logged_in') === 'true' || !!localStorage.getItem('mk_user_profile');
    if (!isLoggedIn) {
      setAuthModalOpen(true);
      return;
    }
    setSelectedContentId(id);
    setSelectedContentType('movie');
    setActiveEpisodeId(null);
    setModalContentId(null);
    setCurrentPage('watch');
  };

  return (
    <div className="pb-24 pt-4 space-y-8 min-h-screen">
      {/* Header & Filter Bar */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#00A651]/20 text-[#00A651] border border-[#00A651]/30">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{t('movies', language)}</h1>
            <p className="text-xs text-neutral-400">Catalogue y'afilime zose ziri kuri MK HERO MOVIES</p>
          </div>
        </div>

        {/* Search & Genre Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Shakisha afilime (Search movie title)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-white focus:outline-none focus:border-[#00A651]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize shrink-0 transition ${
                  selectedGenre === g
                    ? 'bg-[#00A651] text-white shadow-md'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Movies Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl" />
          ))}
        </div>
      ) : filteredMovies.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800 space-y-2">
          <p className="text-white font-bold text-base">Nta afilime ibonetse (No Movies Found)</p>
          <p className="text-neutral-400 text-xs">Gerageza gushakisha irindi zina cyangwa uhitamo icyiciro gishya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMovies.map((m) => (
            <div
              key={m.id}
              onClick={() => openDetails(m.id)}
              className="group relative rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden cursor-pointer transition transform hover:-translate-y-1.5 hover:border-[#00A651]/50"
            >
              <div className="aspect-[2/3] w-full bg-neutral-950 overflow-hidden relative">
                <img
                  src={m.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                  alt={m.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#00A651] flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition">
                    <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white font-bold text-[10px]">
                  {m.genre || m.category || 'MOVIE'}
                </div>

                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow">
                  {m.videoUrl || (m.servers && m.servers.length > 0) ? (
                    <span className="bg-[#00A651]/80 text-white px-1.5 py-0.5 rounded">🟢 ONLINE</span>
                  ) : (
                    <span className="bg-amber-500/80 text-black px-1.5 py-0.5 rounded">🟡 VUBA</span>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-1">
                <h3 className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition">
                  {m.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{m.year || 2026}</span>
                  <span>{m.duration || '1h 45m'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <MovieDetailsModal
        contentId={modalContentId}
        contentType="movie"
        onClose={() => setModalContentId(null)}
        onPlay={(id) => startPlaying(id)}
      />
    </div>
  );
};
