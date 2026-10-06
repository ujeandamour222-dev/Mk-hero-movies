import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRecentlyWatched, RecentlyWatchedItem } from '../lib/recentlyWatched';
import { Clock, Play } from 'lucide-react';

export const RecentlyWatchedSection: React.FC = () => {
  const { setCurrentPage, setSelectedContentId, setSelectedContentType } = useAuth();
  const [items, setItems] = useState<RecentlyWatchedItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyWatched());

    const handleUpdate = () => {
      setItems(getRecentlyWatched());
    };

    window.addEventListener('mk-recently-watched-updated', handleUpdate);
    return () => window.removeEventListener('mk-recently-watched-updated', handleUpdate);
  }, []);

  if (items.length === 0) return null;

  const handlePlay = (item: RecentlyWatchedItem) => {
    setSelectedContentId(item.id);
    setSelectedContentType(item.contentType);
    setCurrentPage('watch');
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-4 py-6 border-t border-neutral-800/80 mt-12 font-sans select-none">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#00A651] animate-pulse" />
          <span>FILIME WAHERUKAGA KUREBA (Recently Watched - Last 3)</span>
        </h2>
        <span className="text-[11px] font-bold text-neutral-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
          {items.length} / 3 Items
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => handlePlay(item)}
            className="group flex items-center gap-3 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-[#00A651]/60 hover:bg-neutral-800/80 cursor-pointer transition transform hover:-translate-y-1 shadow-lg"
          >
            <div className="relative w-20 aspect-[2/3] rounded-xl bg-neutral-950 overflow-hidden shrink-0">
              <img
                src={item.posterUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-[#00A651]/50 transition flex items-center justify-center">
                <Play className="w-6 h-6 fill-white text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-black/60 text-[#00A651] border border-emerald-500/30">
                {item.category || 'AGASOBANUYE'}
              </span>
              <h3 className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition">
                {item.title}
              </h3>
              <p className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono">
                <span>▶ Komeza Kureba</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
