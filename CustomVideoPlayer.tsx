import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { VideoServer } from '../types';
import {
  getAds,
  getAdSettings,
  recordAdImpression,
  AdConfig,
} from '../lib/adManager';
import { sendVisitorHeartbeat } from '../lib/visitorAnalytics';
import { saveRecentlyWatchedItem } from '../lib/recentlyWatched';
import {
  detectVideoSourceType,
  extractYouTubeId,
  isYouTubeUrl,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
  getBunnyEmbedUrl,
  getSafePosterUrl,
} from '../lib/videoUtils';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Download,
  Server,
  Layers,
  RefreshCw,
  ArrowLeft,
  Share2,
  Star,
  Smartphone,
  Volume2,
  VolumeX,
  Maximize,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface CustomVideoPlayerProps {
  contentId: string;
  contentType: 'movie' | 'series';
  title: string;
  posterUrl: string;
  videoUrl: string;
  category?: string;
  episodeId?: string;
  episodeTitle?: string;
  initialResumePosition?: number;
  servers?: VideoServer[];
  activeServerId?: string;
  activeServerType?: string;
  onServerChange?: (server: VideoServer) => void;
  downloadUrl?: string;
  onNextEpisode?: () => void;
  nextEpisodeTitle?: string;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  contentId,
  contentType = 'movie',
  title,
  posterUrl,
  videoUrl,
  category = 'Agasobanuye',
  episodeTitle,
  servers = [],
  activeServerId,
  activeServerType,
  onServerChange,
  downloadUrl,
}) => {
  const { showToast, openPaymentModal, user } = useAuth();

  // Containers & Player References
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMidRollTimeRef = useRef<number>(0);

  // States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isPendingApproval, setIsPendingApproval] = useState<boolean>(false);
  const [selectedQuality, setSelectedQuality] = useState<string>('720p (HD)');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showY2MateModal, setShowY2MateModal] = useState<boolean>(false);
  const [playerSmsInput, setPlayerSmsInput] = useState<string>('');

  // Ad States
  const [showingPreRoll, setShowingPreRoll] = useState<boolean>(false);
  const [preRollAd, setPreRollAd] = useState<AdConfig | null>(null);
  const [preRollTimer, setPreRollTimer] = useState<number>(15);
  const [preRollCanSkip, setPreRollCanSkip] = useState<boolean>(false);
  const [hasPlayedPreRoll, setHasPlayedPreRoll] = useState<boolean>(false);

  const [showingMidRoll, setShowingMidRoll] = useState<boolean>(false);
  const [midRollAd, setMidRollAd] = useState<AdConfig | null>(null);
  const [midRollTimer, setMidRollTimer] = useState<number>(10);

  const [watermarkAd, setWatermarkAd] = useState<AdConfig | null>(null);

  // Force Show Ads Mode for Testing / Admin Preview
  const [forceShowAds, setForceShowAds] = useState<boolean>(() => {
    return localStorage.getItem('mk_force_show_ads') === 'true';
  });

  const [isAdMuted, setIsAdMuted] = useState(false);
  const adVideoRef = useRef<HTMLVideoElement | null>(null);

  const toggleForceShowAds = () => {
    const next = !forceShowAds;
    setForceShowAds(next);
    localStorage.setItem('mk_force_show_ads', String(next));
    showToast(
      next ? '📢 Force Show Ads Active! Amatangazo ari kwiruka kuri video.' : '🔒 Ad-Free VIP Mode Active.',
      next ? 'success' : 'warning'
    );
  };

  // Reset Pre-Roll ad flag when changing content or video URL
  useEffect(() => {
    setHasPlayedPreRoll(false);
    setShowingPreRoll(false);
    setShowingMidRoll(false);
  }, [contentId, videoUrl]);

  // Compute VIP / Paid Status
  const itemExpiry = localStorage.getItem(`subscriptionExpiry_${contentId}`);
  const globalExpiry = localStorage.getItem('subscriptionExpiry_global');
  const expTime = Number(itemExpiry || globalExpiry || 0);
  const isVIP =
    localStorage.getItem('mk_vip_active') === 'true' ||
    (expTime > 0 && Date.now() < expTime) ||
    user?.role === 'admin';

  const shouldShowAds = !isVIP || forceShowAds;

  // Load Watermark Ad for Non-Paying Users or Test Mode
  useEffect(() => {
    if (!shouldShowAds) {
      setWatermarkAd(null);
      return;
    }
    const settings = getAdSettings();
    if (settings.watermarkEnabled) {
      const ads = getAds();
      const found = ads.find((a) => a.enabled && a.type === 'watermark');
      if (found) setWatermarkAd(found);
    }
  }, [shouldShowAds]);

  const handlePlayerSmsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerSmsInput.trim()) return;

    try {
      let pending = JSON.parse(localStorage.getItem('mk_pending_payments') || '[]');
      pending.push({
        id: 'PAY-' + Date.now(),
        phone: '0788123456',
        amount: 300,
        movieId: contentId,
        title: title,
        smsMessage: playerSmsInput,
        timestamp: new Date().toLocaleTimeString(),
      });
      localStorage.setItem('mk_pending_payments', JSON.stringify(pending));
      showToast('✅ Ubutumwa bwa MoMo buhasohowe neza kwa Admin! Tegereza yemere...', 'success');
      setPlayerSmsInput('');
    } catch {}
  };

  // Favorite Star state
  const [isFavorite, setIsFavorite] = useState<boolean>(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('mk_favorites') || '[]');
      return favs.includes(contentId);
    } catch {
      return false;
    }
  });

  const sourceType = detectVideoSourceType(videoUrl, activeServerType);
  const youtubeId = extractYouTubeId(videoUrl);
  const safePoster = getSafePosterUrl(posterUrl, videoUrl);

  // Check 24-hour time-based subscription expiry & admin approval
  const checkExpiry = useCallback(() => {
    try {
      const itemExp = localStorage.getItem(`subscriptionExpiry_${contentId}`);
      const globalExp = localStorage.getItem('subscriptionExpiry_global');
      const isVipLocal = localStorage.getItem('mk_vip_active') === 'true';
      const time = Number(itemExp || globalExp || 0);

      const hasValidSub = isVipLocal || (time > 0 && Date.now() < time) || user?.role === 'admin';

      if (hasValidSub) {
        setIsExpired(false);
        setIsPendingApproval(false);
      } else {
        setIsExpired(true);
      }
    } catch {}
  }, [contentId, user?.role]);

  useEffect(() => {
    checkExpiry();
    const interval = setInterval(checkExpiry, 2000);
    return () => clearInterval(interval);
  }, [checkExpiry]);

  // Load YouTube IFrame API Script dynamically
  useEffect(() => {
    if (sourceType !== 'youtube') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }, [sourceType]);

  // Pause helper
  const pauseVideo = useCallback(() => {
    if (sourceType === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      ytPlayerRef.current.pauseVideo();
    } else if (htmlVideoRef.current) {
      htmlVideoRef.current.pause();
    }
    setIsPlaying(false);
  }, [sourceType]);

  // Start Live Progress Polling & Mid-Roll Ad Triggers
  const startProgressPolling = useCallback(() => {
    if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    updateIntervalRef.current = setInterval(() => {
      let curr = 0;
      let dur = 0;

      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        curr = ytPlayerRef.current.getCurrentTime() || 0;
        dur = ytPlayerRef.current.getDuration() || 0;
      } else if (htmlVideoRef.current) {
        curr = htmlVideoRef.current.currentTime || 0;
        dur = htmlVideoRef.current.duration || 0;
      }

      setCurrentTime(curr);
      if (dur > 0) setDuration(dur);

      // Mid-Roll Ad Check
      const settings = getAdSettings();
      
      if (shouldShowAds && settings.midrollEnabled && curr > 10) {
        const intervalSecs = (settings.midrollIntervalMinutes || 10) * 60;
        if (curr - lastMidRollTimeRef.current >= intervalSecs) {
          const ads = getAds();
          const foundMidRoll = ads.find((a) => a.enabled && a.type === 'midroll');
          if (foundMidRoll) {
            pauseVideo();
            setMidRollAd(foundMidRoll);
            setMidRollTimer(foundMidRoll.duration || 10);
            setShowingMidRoll(true);
            lastMidRollTimeRef.current = curr;
            recordAdImpression(foundMidRoll.id);
          }
        }
      }
    }, 250);
  }, [user, pauseVideo]);

  const stopProgressPolling = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
  }, []);

  // Pre-Roll Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showingPreRoll && preRollTimer > 0) {
      timer = setInterval(() => {
        setPreRollTimer((prev) => {
          const next = prev - 1;
          const skipThreshold = preRollAd ? (preRollAd.duration || 15) - (preRollAd.skipAfter || 5) : 10;
          if (prev <= skipThreshold) {
            setPreRollCanSkip(true);
          }
          if (next <= 0) {
            finishPreRollAndStartMovie();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showingPreRoll, preRollTimer, preRollAd]);

  // Mid-Roll Timer Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showingMidRoll && midRollTimer > 0) {
      timer = setInterval(() => {
        setMidRollTimer((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            finishMidRollAndResumeMovie();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showingMidRoll, midRollTimer]);

  // Pre-roll completion callback
  const finishPreRollAndStartMovie = () => {
    setShowingPreRoll(false);
    executeActualPlay();
  };

  // Mid-roll completion callback
  const finishMidRollAndResumeMovie = () => {
    setShowingMidRoll(false);
    executeActualPlay();
  };

  // Initialize YouTube Player Instance using pure IFrame API (controls: 0)
  const initYouTubePlayer = useCallback(() => {
    if (!youtubeId || !playerContainerRef.current) return;

    if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
      try {
        ytPlayerRef.current.destroy();
      } catch {}
      ytPlayerRef.current = null;
    }

    const createPlayer = () => {
      if (!playerContainerRef.current || !window.YT || !window.YT.Player) return;

      ytPlayerRef.current = new window.YT.Player(playerContainerRef.current, {
        videoId: youtubeId,
        playerVars: {
          controls: 0,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          autoplay: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            if (event.target) {
              setDuration(event.target.getDuration() || 0);
              event.target.setVolume(volume);
              event.target.playVideo();
              setIsPlaying(true);
              startProgressPolling();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsPlaying(true);
              startProgressPolling();
            } else if (event.data === 2 || event.data === 0) {
              setIsPlaying(false);
              stopProgressPolling();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    }
  }, [youtubeId, volume, startProgressPolling, stopProgressPolling]);

  useEffect(() => {
    if (sourceType === 'youtube' && isPlaying) {
      initYouTubePlayer();
    }
    return () => {
      stopProgressPolling();
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
        ytPlayerRef.current = null;
      }
    };
  }, [sourceType, videoUrl, initYouTubePlayer, stopProgressPolling]);

  // Actual play trigger
  const executeActualPlay = async () => {
    // Save current content to localStorage recently watched list
    if (contentId && title) {
      saveRecentlyWatchedItem({
        id: contentId,
        title: title,
        posterUrl: posterUrl,
        category: category,
        contentType: contentType || 'movie',
      });
    }

    if (sourceType === 'youtube') {
      if (!ytPlayerRef.current) {
        setIsPlaying(true);
        initYouTubePlayer();
      } else if (typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        startProgressPolling();
      }
    } else if (htmlVideoRef.current) {
      try {
        await htmlVideoRef.current.play();
        setIsPlaying(true);
        startProgressPolling();
      } catch {
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(true);
    }
  };

  // Master Play Trigger with Pre-Roll Ad Check
  const playVideo = async () => {
    if (isExpired) {
      openPaymentModal(300, 'VIP Access (24 Hours)', 1);
      return;
    }

    // Pre-Roll Ad Check
    const settings = getAdSettings();
    const ads = getAds();
    const foundPreRoll = ads.find((a) => a.enabled && a.type === 'preroll');

    if (shouldShowAds && !hasPlayedPreRoll && settings.prerollEnabled && foundPreRoll) {
      setPreRollAd(foundPreRoll);
      setPreRollTimer(foundPreRoll.duration || 15);
      setPreRollCanSkip(false);
      setShowingPreRoll(true);
      setHasPlayedPreRoll(true);
      recordAdImpression(foundPreRoll.id);
      return;
    }

    executeActualPlay();
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseVideo();
    } else {
      playVideo();
    }
  };

  // Master Seek Function
  const handleSeek = (targetSeconds: number) => {
    const clamped = Math.max(0, Math.min(duration || 100, targetSeconds));
    setCurrentTime(clamped);

    if (sourceType === 'youtube' && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      ytPlayerRef.current.seekTo(clamped, true);
    } else if (htmlVideoRef.current) {
      htmlVideoRef.current.currentTime = clamped;
    }
  };

  const skipTime = (seconds: number) => {
    handleSeek(currentTime + seconds);
  };

  const skipIntro = () => {
    handleSeek(30);
    playVideo();
  };

  // Master Volume Function
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);

    if (sourceType === 'youtube' && ytPlayerRef.current) {
      if (typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(newVol);
      }
      if (newVol === 0 && typeof ytPlayerRef.current.mute === 'function') {
        ytPlayerRef.current.mute();
      } else if (typeof ytPlayerRef.current.unmute === 'function') {
        ytPlayerRef.current.unmute();
      }
    } else if (htmlVideoRef.current) {
      htmlVideoRef.current.volume = newVol / 100;
      htmlVideoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      handleVolumeChange(volume || 80);
    } else {
      handleVolumeChange(0);
    }
  };

  // Fullscreen Function
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Video Quality Change Function
  const handleQualityChange = (qLabel: string) => {
    setSelectedQuality(qLabel);

    // 1. If servers list has a server matching the chosen quality, switch active server
    if (servers && servers.length > 0 && onServerChange) {
      const matchKey = qLabel.split(' ')[0].toLowerCase().replace('hd', '').replace('mid', '').replace('low', '');
      const matchingServer = servers.find((s) => {
        const sq = (s.quality || '').toLowerCase();
        return sq.includes(matchKey) || sq.includes(qLabel.toLowerCase());
      });
      if (matchingServer) {
        onServerChange(matchingServer);
      }
    }

    // 2. If YouTube player, set YouTube playback quality
    if (sourceType === 'youtube' && ytPlayerRef.current) {
      let ytQuality = 'auto';
      if (qLabel.includes('1080p') || qLabel === 'HD') ytQuality = 'hd1080';
      else if (qLabel.includes('720p')) ytQuality = 'hd720';
      else if (qLabel.includes('480p') || qLabel === 'MID') ytQuality = 'large';
      else if (qLabel.includes('360p') || qLabel === 'LOW') ytQuality = 'medium';

      if (typeof ytPlayerRef.current.setPlaybackQualityRange === 'function') {
        ytPlayerRef.current.setPlaybackQualityRange(ytQuality, ytQuality);
      } else if (typeof ytPlayerRef.current.setPlaybackQuality === 'function') {
        ytPlayerRef.current.setPlaybackQuality(ytQuality);
      }
    }

    // 3. Heartbeat update
    sendVisitorHeartbeat('watch', title, qLabel, user?.name);

    showToast(`✅ Ubwiza bwa video buhinduwe neza kuri ${qLabel}!`, 'success');
  };

  const cycleQuality = () => {
    if (selectedQuality.includes('HD') || selectedQuality.includes('720p') || selectedQuality.includes('1080p')) {
      handleQualityChange('480p (MID)');
    } else if (selectedQuality.includes('MID') || selectedQuality.includes('480p')) {
      handleQualityChange('360p (LOW)');
    } else {
      handleQualityChange('720p (HD)');
    }
  };

  // Working Download To Gallery Trigger
  const handleDownloadToGallery = async () => {
    const isDirectMp4 = videoUrl.endsWith('.mp4') || sourceType === 'mp4' || (downloadUrl && downloadUrl.endsWith('.mp4'));
    const urlToDownload = downloadUrl || videoUrl;

    if (isDirectMp4 && urlToDownload) {
      showToast('Gutangira kumanura video muri Gallery...', 'warning');
      try {
        const response = await fetch(urlToDownload);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `MK_Hero_Movie_${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
        showToast('Video yamanuwe neza muri Gallery!', 'success');
      } catch {
        const link = document.createElement('a');
        link.href = urlToDownload;
        link.download = `MK_Hero_Movie_${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Video iri kumanurwa...', 'success');
      }
    } else {
      setShowY2MateModal(true);
    }
  };

  // MoMo Payment Trigger (*182*8*1*1115705*300#)
  const handleMoMoPay = () => {
    const ussdCode = '*182*8*1*1115705*300#';

    try {
      let pending = JSON.parse(localStorage.getItem('mk_pending_payments') || '[]');
      pending.push({
        id: 'PAY-' + Date.now(),
        phone: '0788123456',
        amount: 300,
        movieId: contentId,
        title: title,
        timestamp: new Date().toLocaleTimeString(),
      });
      localStorage.setItem('mk_pending_payments', JSON.stringify(pending));
    } catch {}

    setIsPendingApproval(true);
    window.location.href = `tel:${encodeURIComponent(ussdCode)}`;
    showToast('Code yoherejwe! Kanda Call kuri telefoni yawe wemeze na PIN.', 'success');
  };

  const toggleFavorite = () => {
    try {
      let favs = JSON.parse(localStorage.getItem('mk_favorites') || '[]');
      if (favs.includes(contentId)) {
        favs = favs.filter((id: string) => id !== contentId);
        setIsFavorite(false);
        showToast('Wavanye filime muri Favorite', 'warning');
      } else {
        favs.push(contentId);
        setIsFavorite(true);
        showToast('Wayibitse muri Favorite neza!', 'success');
      }
      localStorage.setItem('mk_favorites', JSON.stringify(favs));
    } catch {}
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link ya filime yakopewe neza!', 'success');
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const availableQualities = ['1080p (HD)', '720p (HD)', '480p (MD)', '360p (LOW)'];

  return (
    <div className="space-y-4 font-sans select-none">
      {/* ------------------------------------------------------------------- */}
      {/* MAIN VIDEO PLAYER FRAME                                              */}
      {/* ------------------------------------------------------------------- */}
      <div
        ref={containerRef}
        onMouseEnter={() => setShowControls(true)}
        className="relative w-full aspect-video sm:aspect-[16/9] bg-black rounded-3xl overflow-hidden shadow-2xl border border-emerald-900/50 group"
      >
        {/* WATERMARK BRANDED OVERLAY (Non-Paying Users) */}
        {!isVIP && watermarkAd && watermarkAd.enabled && (
          <div className="absolute top-16 left-4 z-20 pointer-events-none opacity-80 hover:opacity-100 transition">
            <div className="px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-emerald-500/40 text-[10px] font-black text-emerald-400 uppercase tracking-widest shadow-lg flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00A651] animate-ping" />
              <span>{watermarkAd.mediaUrl || 'MK HERO MOVIES - VIP'}</span>
            </div>
          </div>
        )}

        {/* TOP BAR: Back, MoMo Button, Share, Favorite */}
        <div
          className={`absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 bg-[#080d09] border-b border-emerald-950/80 flex items-center justify-between transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
          }`}
        >
          <button
            onClick={() => window.history.back()}
            className="min-w-[44px] min-h-[44px] rounded-full bg-black/60 hover:bg-[#00A651] text-white flex items-center justify-center transition cursor-pointer backdrop-blur-md"
            title="Soma inyuma"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center truncate px-2 max-w-xs">
            <span className="text-xs font-black text-white truncate block">MK HERO MOVIES</span>
            <span className="text-[10px] text-emerald-400 font-bold truncate block">
              {episodeTitle ? `${title} - ${episodeTitle}` : title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* IN-PLAYER TOP QUALITY SELECTOR: HD | MID | LOW (MATCHING USER REQUEST) */}
            <div className="flex items-center p-1 rounded-2xl bg-black/80 backdrop-blur-md border border-neutral-700/80 shadow-2xl shrink-0">
              <button
                type="button"
                onClick={() => handleQualityChange('720p (HD)')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer min-h-[36px] ${
                  selectedQuality.includes('HD') || selectedQuality.includes('720p') || selectedQuality.includes('1080p')
                    ? 'bg-[#00A651] text-white shadow-lg border border-emerald-400 font-black'
                    : 'text-neutral-300 hover:text-white font-bold'
                }`}
              >
                HD
              </button>
              <button
                type="button"
                onClick={() => handleQualityChange('480p (MID)')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer min-h-[36px] ${
                  selectedQuality.includes('MID') || selectedQuality.includes('480p')
                    ? 'bg-[#00A651] text-white shadow-lg border border-emerald-400 font-black'
                    : 'text-neutral-300 hover:text-white font-bold'
                }`}
              >
                MID
              </button>
              <button
                type="button"
                onClick={() => handleQualityChange('360p (LOW)')}
                className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer min-h-[36px] ${
                  selectedQuality.includes('LOW') || selectedQuality.includes('360p')
                    ? 'bg-[#00A651] text-white shadow-lg border border-emerald-400 font-black'
                    : 'text-neutral-300 hover:text-white font-bold'
                }`}
              >
                LOW
              </button>
            </div>

            {isVIP ? (
              <div className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs flex items-center gap-1.5 shadow-md">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>👑 VIP</span>
              </div>
            ) : (
              <button
                onClick={handleMoMoPay}
                className="px-3.5 py-2 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-black flex items-center gap-1.5 shadow-lg transition active:scale-95 cursor-pointer min-h-[44px]"
              >
                <Smartphone className="w-4 h-4 text-white" />
                <span>🆓 FREE (Shyura VIP)</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="min-w-[44px] min-h-[44px] rounded-full bg-black/60 hover:bg-[#00A651] text-white flex items-center justify-center transition cursor-pointer backdrop-blur-md"
              title="Sangiza Link"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFavorite}
              className={`min-w-[44px] min-h-[44px] rounded-full bg-black/60 hover:bg-[#00A651] text-white flex items-center justify-center transition cursor-pointer backdrop-blur-md ${
                isFavorite ? 'text-yellow-400 fill-yellow-400' : ''
              }`}
              title="Favorite"
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* PRE-ROLL AD OVERLAY */}
        {showingPreRoll && preRollAd && (() => {
          const rawVideo = preRollAd.videoUrl || preRollAd.mediaUrl || '';
          const ytId = extractYouTubeId(rawVideo) || extractYouTubeId(preRollAd.targetUrl || '') || extractYouTubeId(preRollAd.mediaUrl || '');
          const isYt = !!ytId;
          const rawThumb = preRollAd.thumbnailUrl || preRollAd.mediaUrl;
          const adThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : (rawThumb && rawThumb.startsWith('http') ? rawThumb : 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80');
          const isVertical = preRollAd.aspectRatio === '9:16';

          return (
            <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 text-center space-y-3 overflow-y-auto">
              <div className="space-y-1 max-w-md shrink-0">
                <div className="flex items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase border border-amber-500/30">
                    📢 PRE-ROLL VIDEO ITANGAZO / AD
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                    {isVertical ? '📱 9:16 VERTICAL' : '📺 16:9 LANDSCAPE'}
                  </span>
                </div>
                <p className="text-xs text-emerald-300 font-mono font-bold pt-1">
                  Iyi filime izatangira otomatic mu <strong className="text-amber-400 text-sm">{preRollTimer}s</strong>...
                </p>
                <h3 className="text-base sm:text-lg font-black text-white">{preRollAd.title}</h3>
              </div>

              {/* VIDEO AD CONTAINER (16:9 vs 9:16) */}
              <div
                className={`relative rounded-3xl overflow-hidden border-2 border-amber-500/60 shadow-2xl bg-black mx-auto group ${
                  isVertical
                    ? 'w-full max-w-[280px] sm:max-w-xs aspect-[9/16] max-h-[55vh]'
                    : 'w-full max-w-lg aspect-video'
                }`}
              >
                {isYt && ytId ? (
                  <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=${isAdMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&autohide=1&playlist=${ytId}&loop=1`}
                      title={preRollAd.title}
                      className="w-full h-full scale-[1.38] origin-center pointer-events-none border-0"
                      allow="autoplay; encrypted-media"
                    />
                  </div>
                ) : rawVideo.endsWith('.mp4') || preRollAd.videoUrl ? (
                  <video
                    ref={adVideoRef}
                    src={preRollAd.videoUrl || rawVideo}
                    poster={adThumb}
                    autoPlay
                    muted={isAdMuted}
                    loop
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <img
                    src={adThumb}
                    alt={preRollAd.title}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                )}

                {/* AUDIO SOUND UNMUTE/MUTE TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsAdMuted(!isAdMuted)}
                  className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white font-black text-xs border border-amber-400/60 shadow-lg flex items-center gap-1.5 backdrop-blur-md transition active:scale-95 cursor-pointer"
                >
                  {isAdMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="text-amber-300">🔊 VUZA AMAJWI</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">🔇 FUNGA AMAJWI</span>
                    </>
                  )}
                </button>

                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[10px] font-mono text-amber-300 border border-amber-500/30">
                  ▶ VIDEO AD ({isVertical ? '9:16' : '16:9'})
                </div>
              </div>
            </div>
          );
        })()}

        {/* MID-ROLL AD OVERLAY */}
        {showingMidRoll && midRollAd && (() => {
          const rawVideo = midRollAd.videoUrl || midRollAd.mediaUrl || '';
          const ytId = extractYouTubeId(rawVideo) || extractYouTubeId(midRollAd.targetUrl || '') || extractYouTubeId(midRollAd.mediaUrl || '');
          const isYt = !!ytId;
          const rawThumb = midRollAd.thumbnailUrl || midRollAd.mediaUrl;
          const adThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : (rawThumb && rawThumb.startsWith('http') ? rawThumb : 'https://images.unsplash.com/photo-1556742049-0a670f4a4591?w=800&q=80');
          const isVertical = midRollAd.aspectRatio === '9:16';

          return (
            <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 text-center space-y-3 overflow-y-auto">
              <div className="space-y-1 max-w-md shrink-0">
                <div className="flex items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase border border-amber-500/30">
                    📢 MID-ROLL VIDEO ITANGAZO / AD
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                    {isVertical ? '📱 9:16 VERTICAL' : '📺 16:9 LANDSCAPE'}
                  </span>
                </div>
                <p className="text-xs text-emerald-300 font-mono font-bold pt-1">
                  Video izakomeza otomatic mu <strong className="text-amber-400 text-sm">{midRollTimer}s</strong>...
                </p>
                <h3 className="text-base sm:text-lg font-black text-white">{midRollAd.title}</h3>
              </div>

              {/* VIDEO AD CONTAINER (16:9 vs 9:16) */}
              <div
                className={`relative rounded-3xl overflow-hidden border-2 border-amber-500/60 shadow-2xl bg-black mx-auto group ${
                  isVertical
                    ? 'w-full max-w-[280px] sm:max-w-xs aspect-[9/16] max-h-[55vh]'
                    : 'w-full max-w-lg aspect-video'
                }`}
              >
                {isYt && ytId ? (
                  <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=${isAdMuted ? 1 : 0}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&autohide=1&playlist=${ytId}&loop=1`}
                      title={midRollAd.title}
                      className="w-full h-full scale-[1.38] origin-center pointer-events-none border-0"
                      allow="autoplay; encrypted-media"
                    />
                  </div>
                ) : rawVideo.endsWith('.mp4') || midRollAd.videoUrl ? (
                  <video
                    ref={adVideoRef}
                    src={midRollAd.videoUrl || rawVideo}
                    poster={adThumb}
                    autoPlay
                    muted={isAdMuted}
                    loop
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <img
                    src={adThumb}
                    alt={midRollAd.title}
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1556742049-0a670f4a4591?w=800&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                )}

                {/* AUDIO SOUND UNMUTE/MUTE TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={() => setIsAdMuted(!isAdMuted)}
                  className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white font-black text-xs border border-amber-400/60 shadow-lg flex items-center gap-1.5 backdrop-blur-md transition active:scale-95 cursor-pointer"
                >
                  {isAdMuted ? (
                    <>
                      <VolumeX className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="text-amber-300">🔊 VUZA AMAJWI</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">🔇 FUNGA AMAJWI</span>
                    </>
                  )}
                </button>

                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md text-[10px] font-mono text-amber-300 border border-amber-500/30">
                  ▶ VIDEO AD ({isVertical ? '9:16' : '16:9'})
                </div>
              </div>
            </div>
          );
        })()}

        {/* FLOATING "SIMBUTSA INTRO (00:30)" BUTTON */}
        {currentTime < 30 && (
          <button
            onClick={skipIntro}
            className="absolute top-16 right-4 z-30 px-4 py-2.5 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition transform hover:scale-105 active:scale-95 cursor-pointer min-h-[44px]"
          >
            <span>⏭ Simbutsa Intro (00:30)</span>
          </button>
        )}

        {/* PENDING ADMIN APPROVAL OVERLAY */}
        {isPendingApproval && (
          <div className="absolute inset-0 z-45 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 overflow-y-auto">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#00A651]/20 border-2 border-[#00A651] text-[#00A651] flex items-center justify-center text-2xl sm:text-3xl shadow-[0_0_30px_rgba(0,166,81,0.5)] animate-bounce shrink-0">
              ✓
            </div>
            <div className="space-y-1.5 max-w-md w-full">
              <h3 className="text-lg sm:text-xl font-black text-[#00A651]">✅ Code yoherejwe!</h3>
              <p className="text-xs text-emerald-200 font-bold leading-relaxed bg-black/50 p-2.5 rounded-2xl border border-emerald-500/30">
                Tegereza Admin yemeze kwishyura kwawe kugira ngo video ifunguke.
              </p>

              {/* INPUT FORM FOR MOMO SMS CONFIRMATION */}
              <form
                onSubmit={handlePlayerSmsSubmit}
                className="p-3 rounded-2xl bg-black/80 border border-emerald-500/40 text-left space-y-2 mt-2"
              >
                <label className="block text-[11px] font-black text-amber-300 uppercase">
                  📋 Paste / Andika ubutumwa bwa MoMo hano (SMS / TxID):
                </label>
                <input
                  type="text"
                  placeholder="Urugero: TxID: 28471928374..."
                  value={playerSmsInput}
                  onChange={(e) => setPlayerSmsInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-emerald-500/40 text-white font-mono text-xs outline-none focus:border-[#00A651]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer min-h-[44px]"
                >
                  📤 YOHEREZA UBU TUMWA KWA ADMIN
                </button>
              </form>

              <p className="text-[10px] text-neutral-400 font-mono animate-pulse pt-1">
                ⏳ Buri kugenzurwa mu buryo bw'ako kanya (Waiting for Admin approval)...
              </p>
            </div>
          </div>
        )}

        {/* EXPIRY OVERLAY WHEN 24H ACCESS IS EXPIRED */}
        {isExpired && (
          <div className="absolute inset-0 z-40 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl shadow-2xl shrink-0">
              ⚠️
            </div>
            <div className="space-y-1 max-w-md w-full">
              <h3 className="text-base sm:text-lg font-black text-white">Igihe Cyawe Cyo Kureba Kirangiye!</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Shyura (300 FRW) kuri MoMo ushyiremo ubutumwa hano, cyangwa kanda buto yo kwishyura.
              </p>

              {/* INPUT FORM FOR MOMO SMS CONFIRMATION */}
              <form
                onSubmit={handlePlayerSmsSubmit}
                className="p-3 rounded-2xl bg-black/80 border border-emerald-500/40 text-left space-y-2 mt-2"
              >
                <label className="block text-[11px] font-black text-amber-300 uppercase">
                  📋 Paste / Andika ubutumwa bwa MoMo hano (SMS / TxID):
                </label>
                <input
                  type="text"
                  placeholder="Urugero: TxID: 28471928374..."
                  value={playerSmsInput}
                  onChange={(e) => setPlayerSmsInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-emerald-500/40 text-white font-mono text-xs outline-none focus:border-[#00A651]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer min-h-[44px]"
                >
                  📤 YOHEREZA UBU TUMWA KWA ADMIN
                </button>
              </form>

              <button
                onClick={handleMoMoPay}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider shadow-xl transition active:scale-95 cursor-pointer min-h-[44px] mt-2"
              >
                💳 KWISHYURA MOMO ON-CLICK (*182*8*1*1115705*300#)
              </button>
            </div>
          </div>
        )}

        {/* POSTER DISPLAY BEFORE INITIAL PLAY */}
        {safePoster && !isPlaying && (
          <div className="absolute inset-0 z-20 bg-black">
            <img src={safePoster} alt={title} className="w-full h-full object-cover opacity-75" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <button
              onClick={playVideo}
              className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-[#00A651] hover:bg-[#008f45] text-white flex flex-col items-center justify-center shadow-[0_0_40px_rgba(0,166,81,0.6)] backdrop-blur-md transition-transform transform hover:scale-110 active:scale-95 border-2 border-white/20 z-20 cursor-pointer min-w-[44px] min-h-[44px]"
            >
              <Play className="w-8 h-8 fill-white text-white ml-1" />
              <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">REBA</span>
            </button>
          </div>
        )}

        {/* YOUTUBE IFRAME API PLAYER EMBED */}
        {sourceType === 'youtube' && (
          <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            <div ref={playerContainerRef} className="w-full h-full min-h-[100%] border-0 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-14 bg-black z-20 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-28 h-10 bg-black z-20 pointer-events-none rounded-tl-xl" />
          </div>
        )}

        {/* BUNNY STREAM PLAYER EMBED */}
        {sourceType === 'bunny' && isPlaying && (
          <iframe
            src={getBunnyEmbedUrl(videoUrl, true)}
            title={title}
            className="w-full h-full relative z-10 border-0"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* NATIVE HTML5 / DIRECT MP4 VIDEO PLAYER */}
        {(sourceType === 'mp4' || sourceType === 'hls') && (
          <video
            ref={htmlVideoRef}
            src={videoUrl}
            poster={safePoster || undefined}
            playsInline
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            className="w-full h-full object-contain cursor-pointer relative z-10"
          />
        )}

        {/* CUSTOM OVERLAY PLAYER CONTROLS */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black via-black/90 to-transparent space-y-3 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-white shrink-0">{formatTime(currentTime)}</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#00A651] flex-1 outline-none"
              />
            </div>
            <span className="text-xs font-mono font-bold text-white shrink-0">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="w-10 h-10 rounded-xl bg-neutral-900/80 hover:bg-[#00A651] text-white flex items-center justify-center transition cursor-pointer min-w-[44px] min-h-[44px]"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-emerald-400 opacity-75" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-16 sm:w-24 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#00A651] hidden sm:block"
              />
            </div>

            <div className="flex items-center justify-center gap-4 sm:gap-8">
              <button
                onClick={() => skipTime(-10)}
                className="min-w-[44px] min-h-[44px] text-white hover:text-[#00A651] font-extrabold transition cursor-pointer flex flex-col items-center justify-center active:scale-90"
                title="Gusubira inyuma 10s"
              >
                <RotateCcw className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                onClick={() => handleSeek(0)}
                className="min-w-[44px] min-h-[44px] text-white hover:text-[#00A651] font-extrabold transition cursor-pointer flex items-center justify-center active:scale-90"
                title="Gutangira mbere"
              >
                <SkipBack className="w-6 h-6 fill-white text-white stroke-[1.5]" />
              </button>

              <button
                onClick={togglePlay}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#00A651] hover:bg-[#008f45] text-white flex items-center justify-center shadow-[0_0_25px_rgba(0,166,81,0.6)] transition transform hover:scale-110 active:scale-95 cursor-pointer min-w-[44px] min-h-[44px]"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-white text-white" />
                ) : (
                  <Play className="w-7 h-7 fill-white text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={() => handleSeek(duration - 5)}
                className="min-w-[44px] min-h-[44px] text-white hover:text-[#00A651] font-extrabold transition cursor-pointer flex items-center justify-center active:scale-90"
                title="Kujya nyuma"
              >
                <SkipForward className="w-6 h-6 fill-white text-white stroke-[1.5]" />
              </button>

              <button
                onClick={() => skipTime(10)}
                className="min-w-[44px] min-h-[44px] text-white hover:text-[#00A651] font-extrabold transition cursor-pointer flex flex-col items-center justify-center active:scale-90"
                title="Kujya imbere 10s"
              >
                <RotateCw className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 rounded-xl bg-neutral-900/80 hover:bg-[#00A651] text-white flex items-center justify-center transition cursor-pointer min-w-[44px] min-h-[44px]"
              title="Aherezo Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* SERVER SELECTION & QUALITY SELECTION BAR */}
      <div className="p-4 rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
            <Server className="w-4 h-4 text-[#00A651]" />
            <span>HITAMO AHO UREBERA VIDEO (SERVERS)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {servers && servers.length > 0 ? (
              servers.map((srv, idx) => {
                const isActive = srv.id === activeServerId || (!activeServerId && idx === 0);
                return (
                  <button
                    key={srv.id || idx}
                    onClick={() => onServerChange && onServerChange(srv)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition active:scale-95 min-h-[44px] cursor-pointer ${
                      isActive
                        ? 'bg-[#00A651] text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{srv.serverName || (idx === 0 ? 'Aho Mbere' : `Aho Kabiri ${idx + 1}`)}</span>
                    <span className="text-[10px] opacity-75 font-mono">({srv.quality || '720p'})</span>
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-neutral-400 italic">Aho Mbere (Primary Video Source)</span>
            )}
          </div>
        </div>

        {/* BIG PROMINENT QUALITY BUTTON BAR (MATCHING USER REQUEST) */}
        <div className="pt-3 border-t border-neutral-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-[#00A651] uppercase tracking-wider">
              <Layers className="w-4 h-4 text-[#00A651]" />
              <span>HITAMO UBWIZA BWA VIDEO (QUALITY SELECTION)</span>
            </div>

            {/* CYCLE TOGGLE BUTTON */}
            <button
              type="button"
              onClick={cycleQuality}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-[#00A651] text-amber-300 hover:text-white font-black text-xs border border-amber-500/30 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Gukanda Uhindure</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* BIG HD BUTTON */}
            <button
              type="button"
              onClick={() => handleQualityChange('720p (HD)')}
              className={`py-3.5 px-3 rounded-2xl font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition active:scale-95 cursor-pointer min-h-[58px] border-2 ${
                selectedQuality.includes('HD') || selectedQuality.includes('720p') || selectedQuality.includes('1080p')
                  ? 'bg-[#00A651] text-white border-emerald-400 shadow-[0_0_25px_rgba(0,166,81,0.6)] font-black text-lg'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700 font-bold text-base'
              }`}
            >
              <span className="text-lg font-black tracking-wide">HD</span>
              <span className="text-[10px] font-mono opacity-80">(720p / 1080p)</span>
            </button>

            {/* BIG MID BUTTON */}
            <button
              type="button"
              onClick={() => handleQualityChange('480p (MID)')}
              className={`py-3.5 px-3 rounded-2xl font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition active:scale-95 cursor-pointer min-h-[58px] border-2 ${
                selectedQuality.includes('MID') || selectedQuality.includes('480p')
                  ? 'bg-[#00A651] text-white border-emerald-400 shadow-[0_0_25px_rgba(0,166,81,0.6)] font-black text-lg'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700 font-bold text-base'
              }`}
            >
              <span className="text-lg font-black tracking-wide">MID</span>
              <span className="text-[10px] font-mono opacity-80">(480p Medium)</span>
            </button>

            {/* BIG LOW BUTTON */}
            <button
              type="button"
              onClick={() => handleQualityChange('360p (LOW)')}
              className={`py-3.5 px-3 rounded-2xl font-black uppercase tracking-wider flex flex-col items-center justify-center gap-0.5 transition active:scale-95 cursor-pointer min-h-[58px] border-2 ${
                selectedQuality.includes('LOW') || selectedQuality.includes('360p')
                  ? 'bg-[#00A651] text-white border-emerald-400 shadow-[0_0_25px_rgba(0,166,81,0.6)] font-black text-lg'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700 font-bold text-base'
              }`}
            >
              <span className="text-lg font-black tracking-wide">LOW</span>
              <span className="text-[10px] font-mono opacity-80">(360p Low)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Y2MATE / YOUTUBE DOWNLOAD NOTICE MODAL */}
      {showY2MateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-md bg-neutral-900 border border-emerald-500/40 rounded-3xl p-6 text-white space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-2xl mx-auto shadow-xl">
              ⚠️
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">KUMANURA VIDEO</h3>
              <p className="text-xs text-amber-300 font-bold leading-relaxed bg-amber-950/60 p-3 rounded-2xl border border-amber-500/30">
                Mbabarira, ntabwo dushobora kumanura iyi video bitewe n'amategeko ya YouTube. Koresha link z'ama MP4 dushyiraho.
              </p>
              <p className="text-[11px] text-neutral-400 leading-normal">
                Ushobora gukopiya iyi link ya video ukoresha urubuga rwa Y2Mate niba ushaka kuyimanura muri Gallery:
              </p>
            </div>

            <div className="p-3 bg-black/60 rounded-xl border border-neutral-800 text-xs font-mono text-emerald-400 truncate">
              {videoUrl}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(videoUrl);
                    showToast('Link ya video yakopewe neza!', 'success');
                  }
                  window.open('https://y2mate.com', '_blank');
                }}
                className="w-full py-3.5 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-xl transition active:scale-95 cursor-pointer min-h-[44px]"
              >
                📋 KOPIYA LINK UJYANE MURI Y2MATE.COM
              </button>

              <button
                onClick={() => setShowY2MateModal(false)}
                className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer min-h-[44px]"
              >
                FUNGA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
