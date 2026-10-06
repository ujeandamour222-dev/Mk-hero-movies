import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Movie, Series } from '../types';
import { X, Play, Heart, Clock, Film, Download, Globe, Shield, Bookmark, BookmarkCheck } from 'lucide-react';
import { StarRatingWidget } from './StarRatingWidget';

interface MovieDetailsModalProps {
  contentId: string | null;
  contentType: 'movie' | 'series' | null;
  onClose: () => void;
  onPlay: (contentId: string, contentType: 'movie' | 'series', episodeId?: string) => void;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  contentId,
  contentType,
  onClose,
  onPlay,
}) => {
  const { user, language } = useAuth();
  const [data, setData] = useState<Movie | Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [inWatchlist, setInWatchlist] = useState<boolean>(false);
  const [activeSeason, setActiveSeason] = useState<number>(1);

  // Sync Watchlist status from localStorage
  useEffect(() => {
    if (!contentId) return;
    try {
      const raw = localStorage.getItem('mk_user_watchlist');
      if (raw) {
        const list = JSON.parse(raw);
        const found = Array.isArray(list) && list.some((item: any) => item.id === contentId);
        setInWatchlist(found);
      } else {
        setInWatchlist(false);
      }
    } catch {
      setInWatchlist(false);
    }
  }, [contentId]);

  const toggleWatchlist = () => {
    if (!contentId || !data) return;
    try {
      const raw = localStorage.getItem('mk_user_watchlist');
      let list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) list = [];

      const exists = list.some((item: any) => item.id === contentId);
      if (exists) {
        list = list.filter((item: any) => item.id !== contentId);
        setInWatchlist(false);
      } else {
        list.unshift({
          id: contentId,
          title: data.title,
          posterUrl: data.posterUrl,
          type: contentType,
          addedAt: new Date().toISOString(),
        });
        setInWatchlist(true);
      }
      localStorage.setItem('mk_user_watchlist', JSON.stringify(list));
      window.dispatchEvent(new Event('mk-watchlist-updated'));
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
    }
  };

  useEffect(() => {
    if (!contentId || !contentType) return;
    let isMounted = true;
    setLoading(true);

    async function fetchDetails() {
      try {
        const endpoint = contentType === 'movie' ? `/api/movies/${contentId}` : `/api/series/${contentId}`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const resData = await res.json();
          if (isMounted) {
            setData(contentType === 'movie' ? resData.movie : resData.series);
          }
        }
      } catch (err) {
        console.error('Failed to fetch details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function checkFavorite() {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/favorites/${user.id}`);
        if (res.ok) {
          const resData = await res.json();
          const found = (resData.favorites || []).some(
            (f: any) => f.contentId === contentId
          );
          if (isMounted) setIsFavorited(found);
        }
      } catch {}
    }

    fetchDetails();
    checkFavorite();

    return () => {
      isMounted = false;
    };
  }, [contentId, contentType, user?.id]);

  if (!contentId || !contentType) return null;

  const toggleFavorite = async () => {
    if (!user) {
      alert('Injira ngo ushyingure iyi film (Please log in to save favorites)');
      return;
    }
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          contentId,
          contentType,
          title: data?.title || '',
          posterUrl: data?.posterUrl || '',
        }),
      });
      if (res.ok) {
        const resData = await res.json();
        setIsFavorited(resData.favorited);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const isSeries = contentType === 'series';
  const seriesData = isSeries ? (data as Series) : null;
  const movieData = !isSeries ? (data as Movie) : null;

  const seasonsList = isSeries && seriesData?.episodes
    ? Array.from(new Set(seriesData.episodes.map((e) => e.seasonNumber || 1))).sort((a, b) => a - b)
    : [1];

  const filteredEpisodes = isSeries && seriesData?.episodes
    ? seriesData.episodes.filter((e) => (e.seasonNumber || 1) === activeSeason)
    : [];

  const activeDownloadUrl = movieData?.downloadUrl || (movieData?.servers && movieData.servers.find(s => s.downloadEnabled)?.downloadUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden text-white my-8 animate-scale-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/70 text-white hover:bg-neutral-800 transition backdrop-blur-md border border-neutral-700/50"
        >
          <X className="w-5 h-5" />
        </button>

        {loading || !data ? (
          <div className="p-16 text-center text-neutral-400 font-medium">
            Gupakira ibisobanuro... (Loading movie metadata...)
          </div>
        ) : (
          <div>
            {/* Header Backdrop & Poster */}
            <div className="relative w-full h-64 sm:h-80 bg-neutral-950 overflow-hidden">
              <img
                src={data.backdropUrl || data.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000'}
                alt={data.title}
                className="w-full h-full object-cover opacity-45 filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/60 to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 flex items-end gap-6">
                <img
                  src={data.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                  alt={data.title}
                  className="w-28 sm:w-36 aspect-[2/3] object-cover rounded-2xl shadow-2xl border-2 border-neutral-700 shrink-0 hidden sm:block"
                />

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-red-600 text-white font-extrabold text-[11px] tracking-wider uppercase shadow-md shadow-red-600/30">
                      {data.genre || data.category || 'Cinema'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-[11px] border border-yellow-500/30">
                      {data.language || 'Kinyarwanda'}
                    </span>
                    {data.country && (
                      <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 font-bold text-[11px]">
                        {data.country}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                    {data.title}
                  </h2>

                  <div className="flex items-center gap-4 text-xs text-neutral-300 flex-wrap">
                    {data.year && (
                      <span className="font-mono font-bold text-yellow-400">{data.year}</span>
                    )}
                    {movieData?.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-red-500" />
                        {movieData.duration}
                      </span>
                    )}
                    {movieData?.rating && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[10px] font-bold text-amber-400">
                        {movieData.rating}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-neutral-400">
                      <Film className="w-3.5 h-3.5" /> {data.views || 0} views
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Action Buttons: WATCH NOW & DOWNLOAD */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    if (isSeries && filteredEpisodes.length > 0) {
                      onPlay(contentId, 'series', filteredEpisodes[0].id);
                    } else {
                      onPlay(contentId, 'movie');
                    }
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 transition transform active:scale-95"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>WATCH NOW / REBA AYA FILIME</span>
                </button>

                {activeDownloadUrl && (
                  <a
                    href={activeDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>DOWNLOAD</span>
                  </a>
                )}

                <button
                  onClick={toggleFavorite}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm border transition cursor-pointer active:scale-95 ${
                    isFavorited
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{isFavorited ? 'Iri muri Favorite' : '+ Favorite'}</span>
                </button>

                {/* WATCHLIST TOGGLE BUTTON */}
                <button
                  onClick={toggleWatchlist}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm border transition cursor-pointer active:scale-95 ${
                    inWatchlist
                      ? 'bg-[#00A651]/20 text-emerald-400 border-[#00A651]/60 shadow-[0_0_15px_rgba(0,166,81,0.25)]'
                      : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white hover:border-[#00A651]'
                  }`}
                  title={inWatchlist ? 'Siba muri Watchlist' : 'Ongeraho muri Watchlist'}
                >
                  {inWatchlist ? (
                    <BookmarkCheck className="w-5 h-5 text-[#00A651]" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                  <span>{inWatchlist ? 'Iri Muri Watchlist ✓' : '+ Watchlist'}</span>
                </button>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  {t('details', language)}
                </h3>
                <p className="text-sm text-neutral-300 leading-relaxed font-normal">
                  {data.description || 'Afilime iryoshye cyane yo kuryoherwa nayo kuri MK HERO MOVIES.'}
                </p>
              </div>

              {/* STAR RATING WIDGET */}
              <StarRatingWidget contentId={contentId} contentTitle={data.title} />

              {/* Series Seasons & Episodes */}
              {isSeries && (
                <div className="space-y-4 pt-4 border-t border-neutral-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-white">Ibyiciro (Episodes)</h3>
                    {seasonsList.length > 1 && (
                      <div className="flex gap-2">
                        {seasonsList.map((seasonNum) => (
                          <button
                            key={seasonNum}
                            onClick={() => setActiveSeason(seasonNum)}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                              activeSeason === seasonNum
                                ? 'bg-red-600 text-white'
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            Season {seasonNum}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {filteredEpisodes.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic">
                      Nta byiciro birashyirwamo. (No episodes added for this season yet).
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                      {filteredEpisodes.map((ep) => (
                        <div
                          key={ep.id}
                          onClick={() => onPlay(contentId, 'series', ep.id)}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-red-600/50 cursor-pointer transition group"
                        >
                          <div className="relative w-20 aspect-video rounded-xl bg-neutral-900 overflow-hidden shrink-0">
                            <img
                              src={ep.thumbnailUrl || data.posterUrl}
                              alt={ep.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-red-600/60 transition">
                              <Play className="w-4 h-4 fill-white text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate group-hover:text-red-400 transition">
                              S{ep.seasonNumber} E{ep.episodeNumber}: {ep.title}
                            </p>
                            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              {ep.duration || '45 min'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
