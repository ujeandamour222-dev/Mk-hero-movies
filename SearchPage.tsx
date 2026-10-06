import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { t } from '../lib/translations';
import { Movie, Series } from '../types';
import { MovieDetailsModal } from '../components/MovieDetailsModal';
import { Search, Film, Clock, X, Trash2, Play, TrendingUp } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const { language, setCurrentPage, setSelectedContentId, setSelectedContentType, searchQuery, setSearchQuery } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [results, setResults] = useState<(Movie | Series)[]>([]);
  const [loading, setLoading] = useState(false);

  const { history, saveSearchTerm, removeSearchTerm, clearHistory } = useSearchHistory();

  const [modalContentId, setModalContentId] = useState<string | null>(null);
  const [modalContentType, setModalContentType] = useState<'movie' | 'series' | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const trimmedQuery = searchQuery.trim();
    const searchParams = new URLSearchParams();
    if (trimmedQuery) searchParams.append('search', trimmedQuery);
    if (selectedCategory) searchParams.append('category', selectedCategory);

    async function performSearch() {
      try {
        const [movRes, serRes] = await Promise.all([
          fetch(`/api/movies?${searchParams.toString()}`),
          fetch(`/api/series?${searchParams.toString()}`),
        ]);

        const movData = movRes.ok ? await movRes.json().catch(() => ({})) : {};
        const serData = serRes.ok ? await serRes.json().catch(() => ({})) : {};
        const combined = [
          ...(movData.movies || []).map((m: Movie) => ({ ...m, contentType: 'movie' as const })),
          ...(serData.series || []).map((s: Series) => ({ ...s, contentType: 'series' as const })),
        ];
        if (isMounted) setResults(combined);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      performSearch();
      if (trimmedQuery.length >= 2) {
        saveSearchTerm(trimmedQuery);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      isMounted = false;
    };
  }, [searchQuery, selectedCategory, saveSearchTerm]);

  return (
    <div className="pb-24 pt-4 space-y-6 max-w-6xl mx-auto px-2 font-sans select-none">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-4 w-5 h-5 text-[#00A651]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchPlaceholder', language)}
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-white placeholder-neutral-500 focus:outline-none focus:border-[#00A651] text-sm shadow-xl transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3.5 p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
            selectedCategory === ''
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
          }`}
        >
          Byose (All)
        </button>
        {['Agasobanuye Action', 'Agasobanuye Drama', 'Rwandan Local Films', 'Rwandan Series', 'Comedy', 'Romance'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
              selectedCategory === cat
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recent Searches Section - Presented before results appear */}
      {history.length > 0 && (
        <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-300 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4 text-red-500" />
              <span>Ibyo waherukaga gushakisha (Recent Searches)</span>
            </div>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-red-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Gusiba Byose (Clear)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {history.map((term) => (
              <div
                key={term}
                onClick={() => setSearchQuery(term)}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800/90 border border-neutral-700/60 hover:border-red-500 text-neutral-200 hover:text-white text-xs font-medium cursor-pointer transition shadow-sm"
              >
                <span>{term}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSearchTerm(term);
                  }}
                  className="p-0.5 rounded-full text-neutral-400 hover:text-red-400 hover:bg-neutral-700 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500 font-medium text-sm">Shakisha... (Searching)</div>
      ) : results.length === 0 ? (
        <div className="p-16 text-center text-neutral-400 space-y-2">
          <Film className="w-10 h-10 text-neutral-600 mx-auto" />
          <p className="font-bold text-sm">Nta afilime ibonetse ku gushakisha kwayo.</p>
          <p className="text-xs text-neutral-500">Gezageza kuhandika irindi zina ry'agateshi.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <span>Ibibonetse ({results.length})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {results.map((item: any) => (
              <div
                key={item.id}
                onClick={() => {
                  setModalContentId(item.id);
                  setModalContentType(item.contentType || ('videoUrl' in item ? 'movie' : 'series'));
                }}
                className="group relative rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden cursor-pointer hover:border-red-600 transition transform hover:-translate-y-1"
              >
                <div className="aspect-[2/3] w-full bg-neutral-950 relative overflow-hidden">
                  <img
                    src={item.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <Play className="w-8 h-8 fill-white text-white" />
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-xs text-white truncate">{item.title}</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MovieDetailsModal
        contentId={modalContentId}
        contentType={modalContentType}
        onClose={() => setModalContentId(null)}
        onPlay={(id, type) => {
          setSelectedContentId(id);
          setSelectedContentType(type);
          setModalContentId(null);
          setCurrentPage('watch');
        }}
      />
    </div>
  );
};


