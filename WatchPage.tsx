import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Movie, Series, Episode, VideoServer } from '../types';
import { CustomVideoPlayer } from '../components/CustomVideoPlayer';
import { BannerAd } from '../components/BannerAd';
import { PopupAdModal } from '../components/PopupAdModal';
import { ArrowLeft, Check, AlertCircle, Film, Lock, Smartphone, ShieldCheck, Clock, Play } from 'lucide-react';
import { StarRatingWidget } from '../components/StarRatingWidget';
import { saveRecentlyWatchedItem, getRecentlyWatched, RecentlyWatchedItem } from '../lib/recentlyWatched';

export const WatchPage: React.FC = () => {
  const {
    selectedContentId,
    selectedContentType,
    setSelectedContentId,
    setSelectedContentType,
    activeEpisodeId,
    setActiveEpisodeId,
    setCurrentPage,
    user,
    setAuthModalOpen,
    openPaymentModal,
  } = useAuth();

  const [movieData, setMovieData] = useState<Movie | null>(null);
  const [seriesData, setSeriesData] = useState<Series | null>(null);
  const [activeEp, setActiveEp] = useState<Episode | null>(null);
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumePos, setResumePos] = useState<number>(0);

  // Active server state
  const [activeServer, setActiveServer] = useState<VideoServer | null>(null);

  // Recently watched list state
  const [recentlyWatchedList, setRecentlyWatchedList] = useState<RecentlyWatchedItem[]>(() => getRecentlyWatched());

  useEffect(() => {
    const handleUpdate = () => {
      setRecentlyWatchedList(getRecentlyWatched());
    };
    window.addEventListener('mk-recently-watched-updated', handleUpdate);
    return () => window.removeEventListener('mk-recently-watched-updated', handleUpdate);
  }, []);

  // Check VIP Status
  const itemExpiry = selectedContentId ? localStorage.getItem(`subscriptionExpiry_${selectedContentId}`) : null;
  const globalExpiry = localStorage.getItem('subscriptionExpiry_global');
  const expTime = Number(itemExpiry || globalExpiry || 0);
  const isVIP = localStorage.getItem('mk_vip_active') === 'true' || expTime > Date.now() || user?.role === 'admin';

  // Check Auth Gate for watching movies
  useEffect(() => {
    if (!selectedContentId) return;

    // Auth Gate
    const isLoggedIn = !!user || localStorage.getItem('mk_is_logged_in') === 'true' || !!localStorage.getItem('mk_user_profile');
    if (!isLoggedIn) {
      setAuthModalOpen(true);
    }
  }, [selectedContentId, user, setAuthModalOpen]);

  useEffect(() => {
    if (!selectedContentId || !selectedContentType) return;
    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        if (selectedContentType === 'movie') {
          const res = await fetch(`/api/movies/${selectedContentId}`);
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            const mov: Movie = data.movie;
            if (isMounted && mov) {
              setMovieData(mov);
              saveRecentlyWatchedItem({
                id: mov.id,
                title: mov.title,
                posterUrl: mov.posterUrl,
                category: mov.category || mov.genre,
                contentType: 'movie',
              });
              if (mov.servers && mov.servers.length > 0) {
                setActiveServer(mov.servers[0]);
              } else if (mov.videoUrl) {
                setActiveServer({
                  id: 'srv_primary',
                  serverName: 'Server 1 (708p HD)',
                  serverUrl: mov.videoUrl,
                  quality: '720p',
                  type: 'youtube',
                  downloadEnabled: !!mov.downloadUrl,
                  downloadUrl: mov.downloadUrl || '',
                });
              }
            }
          }
        } else {
          const res = await fetch(`/api/series/${selectedContentId}`);
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (isMounted && data.series) {
              const ser: Series = data.series;
              setSeriesData(ser);
              saveRecentlyWatchedItem({
                id: ser.id,
                title: ser.title,
                posterUrl: ser.posterUrl,
                category: ser.category || ser.genre,
                contentType: 'series',
              });
              const eps: Episode[] = ser.episodes || [];
              let foundEp: Episode | null = null;

              if (activeEpisodeId) {
                foundEp = eps.find((e) => e.id === activeEpisodeId) || eps[0] || null;
              } else if (eps[0]) {
                foundEp = eps[0];
              }

              setActiveEp(foundEp);

              if (foundEp?.servers && foundEp.servers.length > 0) {
                setActiveServer(foundEp.servers[0]);
              } else if (foundEp?.videoUrl) {
                setActiveServer({
                  id: 'srv_ep_primary',
                  serverName: 'Server 1 (708p HD)',
                  serverUrl: foundEp.videoUrl,
                  quality: '720p',
                  type: 'youtube',
                  downloadEnabled: !!foundEp.downloadUrl,
                  downloadUrl: foundEp.downloadUrl || '',
                });
              }
            }
          }
        }

        // Fetch Related Movies
        const relRes = await fetch('/api/movies');
        if (relRes.ok) {
          const relData = await relRes.json().catch(() => ({}));
          if (isMounted) {
            setRelatedMovies((relData.movies || []).filter((m: Movie) => m.id !== selectedContentId).slice(0, 6));
          }
        }

        // Fetch user resume history
        if (user?.id) {
          const histRes = await fetch(`/api/history/${user.id}`);
          if (histRes.ok) {
            const histData = await histRes.json().catch(() => ({}));
            const targetId = selectedContentType === 'series' && activeEp ? activeEp.id : selectedContentId;
            const match = (histData.history || []).find((h: any) => h.contentId === targetId);
            if (match && match.lastPosition > 10 && isMounted) {
              setResumePos(match.lastPosition);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load watch page data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedContentId, selectedContentType, activeEpisodeId, user?.id]);

  if (!selectedContentId || !selectedContentType) {
    return (
      <div className="p-12 text-center text-white space-y-4 max-w-md mx-auto font-sans">
        <AlertCircle className="w-12 h-12 text-[#00A651] mx-auto" />
        <p className="text-neutral-300 font-bold">Nta film yahitemo.</p>
        <button
          onClick={() => setCurrentPage('home')}
          className="px-6 py-2.5 rounded-2xl bg-[#00A651] font-bold text-sm text-white shadow-lg active:scale-95 transition cursor-pointer min-h-[44px]"
        >
          GARUKA AHABANZA
        </button>
      </div>
    );
  }

  const isSeries = selectedContentType === 'series';
  const currentTitle = isSeries
    ? `${seriesData?.title || 'Series'} ${activeEp ? `- S${activeEp.seasonNumber} E${activeEp.episodeNumber}: ${activeEp.title}` : ''}`
    : movieData?.title || 'IMPUMYI Y\'IMBARAGA ZIDASANZWE Part 1';

  const serversList: VideoServer[] = isSeries
    ? (activeEp?.servers && activeEp.servers.length > 0
        ? activeEp.servers
        : (activeEp?.videoUrl ? [{
            id: 'srv_1',
            serverName: 'Server 1 (708p HD)',
            serverUrl: activeEp.videoUrl,
            quality: '720p',
            type: 'youtube',
            downloadEnabled: !!activeEp.downloadUrl,
            downloadUrl: activeEp.downloadUrl || '',
          }] : []))
    : (movieData?.servers && movieData.servers.length > 0
        ? movieData.servers
        : (movieData?.videoUrl ? [{
            id: 'srv_1',
            serverName: 'Server 1 (708p HD)',
            serverUrl: movieData.videoUrl,
            quality: '720p',
            type: 'youtube',
            downloadEnabled: !!movieData.downloadUrl,
            downloadUrl: movieData.downloadUrl || '',
          }] : []));

  const currentVideoUrl = activeServer?.serverUrl || (isSeries ? activeEp?.videoUrl || '' : movieData?.videoUrl || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const currentPosterUrl = isSeries ? activeEp?.thumbnailUrl || seriesData?.posterUrl || '' : movieData?.posterUrl || '';
  const currentDownloadUrl = activeServer?.downloadUrl || (isSeries ? activeEp?.downloadUrl : movieData?.downloadUrl);
  const categoryName = isSeries ? seriesData?.category : movieData?.category;

  return (
    <div className="pb-24 pt-2 space-y-6 max-w-6xl mx-auto px-2 sm:px-4 font-sans select-none">
      {/* FULLSCREEN POPUP AD FOR NON-PAYING USERS */}
      <PopupAdModal />

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrentPage(isSeries ? 'series' : 'movies')}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition font-extrabold text-xs sm:text-sm active:scale-95 min-h-[44px] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#00A651]" />
          <span>Garuka ku ma film</span>
        </button>

        {isVIP ? (
          <div className="px-3.5 py-2 rounded-2xl bg-[#00A651]/20 border border-[#00A651] text-[#00A651] text-xs font-black flex items-center gap-1.5 shadow-md">
            <ShieldCheck className="w-4 h-4 text-[#00A651]" />
            <span>⭐ Premium Member (Ad-Free)</span>
          </div>
        ) : (
          <button
            onClick={() => {
              const ussdCode = '*182*8*1*1115705*300#';
              window.location.href = `tel:${encodeURIComponent(ussdCode)}`;
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-black transition active:scale-95 min-h-[44px] cursor-pointer shadow-lg shadow-emerald-600/20"
          >
            <Smartphone className="w-4 h-4" />
            <span>KWISHYURA MOMO (300 FRW)</span>
          </button>
        )}
      </div>

      {/* HEADER BANNER AD SLOT */}
      <BannerAd position="header" />

      {/* Main Video Player Container */}
      {loading ? (
        <div className="w-full aspect-video sm:aspect-[16/9] rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse">
          <div className="w-10 h-10 border-4 border-[#00A651] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-extrabold text-white">Video iri gutangira...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <CustomVideoPlayer
            contentId={selectedContentId}
            contentType={selectedContentType}
            title={currentTitle}
            posterUrl={currentPosterUrl}
            videoUrl={currentVideoUrl}
            category={categoryName}
            episodeId={activeEp?.id}
            episodeTitle={activeEp?.title}
            initialResumePosition={resumePos}
            servers={serversList}
            activeServerId={activeServer?.id}
            activeServerType={activeServer?.type}
            onServerChange={(srv) => setActiveServer(srv)}
            downloadUrl={currentDownloadUrl}
          />

          {/* Title & Description Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-[#00A651] text-white font-extrabold text-xs uppercase tracking-wider">
                {categoryName || 'AGASOBANUYE 2026'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 font-bold text-xs">
                54 min
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                ⭐ 9.5 Rating
              </span>

              {/* VIP / FREE VISUAL INDICATOR BADGE */}
              {isVIP ? (
                <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/50 flex items-center gap-1 shadow-md">
                  👑 VIP
                </span>
              ) : (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs border border-emerald-500/40 flex items-center gap-1">
                  🆓 FREE
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {currentTitle}
            </h1>

            <p className="text-sm text-neutral-300 leading-relaxed font-normal">
              {isSeries ? (activeEp?.description || seriesData?.description) : (movieData?.description || "Inkuru y'umusore uvukana ubuhumyi ariko akagira imbaraga z'ikirenga zihishe mu mutima we. Nyuma yo gutakaza umuryango we, ahitamo guhaguruka akarwana n'umwanzi uri gutera umugi wose! Isomire birakaza umurego mu Kinyarwanda cyasobanuwe neza.")}
            </p>

            {/* INTERACTIVE STAR RATING SYSTEM */}
            {selectedContentId && (
              <StarRatingWidget contentId={selectedContentId} contentTitle={currentTitle} />
            )}
          </div>

          {/* RECENTLY WATCHED SECTION BELOW PLAYER */}
          {recentlyWatchedList.length > 0 && (
            <div className="p-5 sm:p-6 rounded-3xl bg-neutral-900 border border-emerald-500/40 space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-[#00A651]/20 text-[#00A651] border border-[#00A651]/40 font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>🕒 FILIME WAHERUKA KUREBA (RECENTLY WATCHED)</span>
                      <span className="w-2 h-2 rounded-full bg-[#00A651] animate-ping" />
                    </h3>
                    <p className="text-xs text-neutral-400">Kanda kuri filime hano niba urashaka gukomeza kureba kuva pawa waherukaho.</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#00A651]/20 border border-[#00A651]/40 text-[#00A651] text-xs font-mono font-black">
                  {recentlyWatchedList.length} Saved
                </span>
              </div>

              {/* Horizontal Scrollable List */}
              <div className="flex items-center gap-3.5 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-emerald-500/50 scrollbar-track-neutral-900 scroll-smooth">
                {recentlyWatchedList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedContentId(item.id);
                      setSelectedContentType(item.contentType);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group relative w-64 sm:w-72 shrink-0 rounded-2xl bg-black/90 border border-neutral-800 overflow-hidden cursor-pointer hover:border-[#00A651] hover:shadow-[0_10px_30px_rgba(0,166,81,0.3)] transition transform hover:-translate-y-1 p-2.5 flex items-center gap-3"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-950 shrink-0 relative">
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-80"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#00A651] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-black text-[9px] uppercase border border-emerald-500/30">
                        {item.contentType}
                      </span>
                      <h4 className="font-black text-xs text-white truncate group-hover:text-[#00A651] transition">
                        {item.title}
                      </h4>
                      <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1 font-mono">
                        <span>▶ Komeza Kureba</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BANNER AD BELOW PLAYER INFO */}
          <BannerAd position="player_bottom" />

          {/* RELATED MOVIES BANNER AD */}
          <BannerAd position="above_related" />

          {/* RELATED MOVIES (FILM ZISANIRA) */}
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-[#00A651]" />
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                FILM ZISANIRA (RELATED MOVIES)
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {relatedMovies.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedContentId(m.id);
                    setSelectedContentType('movie');
                    setCurrentPage('watch');
                  }}
                  className="group relative cursor-pointer rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden hover:border-emerald-500/50 transition duration-300 active:scale-95 shadow-lg"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden bg-neutral-950 relative">
                    <img
                      src={m.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500'}
                      alt={m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <p className="text-xs font-black text-white truncate group-hover:text-emerald-400 transition">
                      {m.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      2026
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
