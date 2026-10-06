import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Series } from '../types';
import { MovieDetailsModal } from '../components/MovieDetailsModal';
import { Tv, Search, Play } from 'lucide-react';

export const SeriesPage: React.FC = () => {
  const { language, setCurrentPage, setSelectedContentId, setSelectedContentType, setActiveEpisodeId, user } = useAuth();

  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalContentId, setModalContentId] = useState<string | null>(null);

  useEffect(() => {
    async function loadSeries() {
      try {
        const res = await fetch('/api/series');
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setSeries(data.series || []);
        }
      } catch (err) {
        console.error('Failed to load series:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSeries();
  }, []);

  const filteredSeries = series.filter((s) => {
    if (s.status === 'draft' && user?.role !== 'admin') return false;
    return (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
           (s.description || '').toLowerCase().includes(search.toLowerCase());
  });

  const openDetails = (id: string) => {
    setModalContentId(id);
  };

  const startPlaying = (id: string, type: 'movie' | 'series', episodeId?: string) => {
    setSelectedContentId(id);
    setSelectedContentType('series');
    if (episodeId) setActiveEpisodeId(episodeId);
    setModalContentId(null);
    setCurrentPage('watch');
  };

  return (
    <div className="pb-24 pt-4 space-y-8 min-h-screen">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Tv className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">{t('series', language)}</h1>
            <p className="text-xs text-neutral-400">Uruhurirane rw'ibice na gahunda zose kuri MK HERO MOVIES</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Shakisha Series (Search TV series title)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Series Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-2xl" />
          ))}
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800 space-y-2">
          <p className="text-white font-bold text-base">Nta Series ibonetse (No Series Found)</p>
          <p className="text-neutral-400 text-xs">Ubuyobozi buza gushyiramo ibice bishya vuba.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredSeries.map((s) => (
            <div
              key={s.id}
              onClick={() => openDetails(s.id)}
              className="group relative rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden cursor-pointer transition transform hover:-translate-y-1.5 hover:border-purple-500/50"
            >
              <div className="aspect-[2/3] w-full bg-neutral-950 overflow-hidden relative">
                <img
                  src={s.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                  alt={s.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition">
                    <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-purple-900/80 text-white font-bold text-[10px]">
                  TV SERIES
                </div>

                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow">
                  {(s.episodes && s.episodes.length > 0) || (s.totalEpisodes && s.totalEpisodes > 0) ? (
                    <span className="bg-[#00A651]/80 text-white px-1.5 py-0.5 rounded">🟢 ONLINE</span>
                  ) : (
                    <span className="bg-amber-500/80 text-black px-1.5 py-0.5 rounded">🟡 VUBA</span>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-1">
                <h3 className="font-bold text-sm text-white truncate group-hover:text-purple-400 transition">
                  {s.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{s.seasonsCount || 1} Seasons</span>
                  <span>{s.totalEpisodes || 0} Episodes</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <MovieDetailsModal
        contentId={modalContentId}
        contentType="series"
        onClose={() => setModalContentId(null)}
        onPlay={startPlaying}
      />
    </div>
  );
};
