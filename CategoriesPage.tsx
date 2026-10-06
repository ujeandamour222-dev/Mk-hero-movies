import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Category, Movie } from '../types';
import { MovieDetailsModal } from '../components/MovieDetailsModal';
import { Grid, Film, ChevronRight, Play } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { language, selectedCategorySlug, setSelectedCategorySlug, setCurrentPage, setSelectedContentId, setSelectedContentType, setActiveEpisodeId } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalContentId, setModalContentId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [catRes, movRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/movies'),
        ]);

        const catData = catRes.ok ? await catRes.json().catch(() => ({})) : {};
        const movData = movRes.ok ? await movRes.json().catch(() => ({})) : {};
        if (isMounted) {
          setCategories(catData.categories || []);
          setMovies(movData.movies || []);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeCategory = categories.find((c) => c.slug === selectedCategorySlug) || null;

  const filteredMovies = activeCategory
    ? movies.filter(
        (m) =>
          (m.category || '').toLowerCase() === activeCategory.name.toLowerCase() ||
          (m.genre || '').toLowerCase() === activeCategory.name.toLowerCase() ||
          (m.category || '').toLowerCase() === activeCategory.slug.toLowerCase()
      )
    : movies;

  const startPlaying = (id: string) => {
    setSelectedContentId(id);
    setSelectedContentType('movie');
    setActiveEpisodeId(null);
    setModalContentId(null);
    setCurrentPage('watch');
  };

  return (
    <div className="pb-24 pt-4 space-y-8 max-w-6xl mx-auto">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Grid className="w-6 h-6 text-red-500" />
            <span>{t('categories', language)}</span>
          </h1>

          {activeCategory && (
            <button
              onClick={() => setSelectedCategorySlug(null)}
              className="text-xs font-bold text-red-500 hover:text-red-400 transition"
            >
              ← Ibyiciro zose (All Categories)
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-400 mt-1">
          {activeCategory
            ? `Afilime zo muri: ${activeCategory.name}`
            : 'Hitamo icyiciro wifuza kuryoherwamo na afilime.'}
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-neutral-500">Tegereza ibyiciro...</div>
      ) : activeCategory ? (
        <div className="space-y-6">
          {filteredMovies.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800 space-y-2">
              <p className="text-white font-bold">Nta afilime irashyirwa muri iki cyiciro</p>
              <p className="text-neutral-400 text-xs">Ubuyobozi buza gushyiramo afilime shya vuba.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMovies.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setModalContentId(m.id)}
                  className="group relative rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden cursor-pointer transition transform hover:-translate-y-1.5 hover:border-red-600/50"
                >
                  <div className="aspect-[2/3] w-full bg-neutral-950 overflow-hidden relative">
                    <img
                      src={m.posterUrl}
                      alt={m.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition">
                        <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-white truncate group-hover:text-red-400">
                      {m.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategorySlug(cat.slug)}
              className="group p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-600/50 cursor-pointer transition transform hover:-translate-y-1 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center font-bold">
                  <Film className="w-5 h-5" />
                </div>
                <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-red-500 transition" />
              </div>
              <h3 className="text-lg font-black text-white mt-4 group-hover:text-red-400 transition">
                {cat.name}
              </h3>
              <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                {cat.description || 'Reba afilime nziza muri iki cyiciro.'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      <MovieDetailsModal
        contentId={modalContentId}
        contentType="movie"
        onClose={() => setModalContentId(null)}
        onPlay={startPlaying}
      />
    </div>
  );
};
