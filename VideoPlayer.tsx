import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import * as PlyrModule from 'plyr';
const Plyr = (PlyrModule as any).default || PlyrModule;
import {
  detectVideoSourceType,
  extractYouTubeId,
  getYouTubeEmbedUrl,
  getBunnyEmbedUrl,
  getSafePosterUrl,
} from '../lib/videoUtils';
import { AlertTriangle, Play } from 'lucide-react';

export interface VideoPlayerProps {
  sourceType?: 'youtube' | 'mp4' | 'hls' | 'bunny' | string;
  url: string;
  posterUrl?: string;
  title?: string;
  autoplay?: boolean;
  onEnded?: () => void;
  onError?: (errorMessage: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  sourceType: explicitSourceType,
  url,
  posterUrl,
  title = 'Video',
  autoplay = true,
  onEnded,
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const plyrContainerRef = useRef<HTMLDivElement | null>(null);
  const plyrInstanceRef = useRef<Plyr | null>(null);

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isStarted, setIsStarted] = useState(autoplay);

  const resolvedSourceType = detectVideoSourceType(url, explicitSourceType);
  const safePoster = getSafePosterUrl(posterUrl, url);

  useEffect(() => {
    if (resolvedSourceType === 'youtube' && isStarted && plyrContainerRef.current) {
      if (plyrInstanceRef.current) {
        try {
          plyrInstanceRef.current.destroy();
        } catch {}
        plyrInstanceRef.current = null;
      }

      try {
        const player = new Plyr(plyrContainerRef.current, {
          youtube: {
            noCookie: true,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            controls: 0,
          },
          controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'mute',
            'volume',
            'captions',
            'settings',
            'pip',
            'fullscreen',
          ],
          autoplay: true,
        });
        plyrInstanceRef.current = player;
      } catch (err) {
        console.warn('Plyr warning:', err);
      }

      return () => {
        if (plyrInstanceRef.current) {
          try {
            plyrInstanceRef.current.destroy();
          } catch {}
          plyrInstanceRef.current = null;
        }
      };
    }
  }, [resolvedSourceType, isStarted, url]);

  useEffect(() => {
    setHasError(false);
    setErrorMessage('');

    if (!url || url.trim() === '') {
      const err = 'Video ntabwo yabonetse. Reba niba aho video ibarizwa ari ho neza.';
      setHasError(true);
      setErrorMessage(err);
      if (onError) onError(err);
      return;
    }

    if (resolvedSourceType === 'youtube' || resolvedSourceType === 'bunny') {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (resolvedSourceType === 'hls' && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          const err = 'Video ntiyafungutse. Gerageza ahandi urebera.';
          setHasError(true);
          setErrorMessage(err);
          if (onError) onError(err);
        }
      });

      hlsRef.current = hls;
    } else {
      video.src = url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, resolvedSourceType, onError]);

  if (hasError) {
    return (
      <div className="w-full aspect-video rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <p className="text-sm font-extrabold text-white">HABAYE IKIBAZO</p>
        <p className="text-xs text-neutral-300 max-w-md">
          {errorMessage || 'Video ntiyafungutse. Gerageza ahandi urebera.'}
        </p>
      </div>
    );
  }

  if (!isStarted && safePoster) {
    return (
      <div className="relative w-full aspect-video rounded-3xl bg-black overflow-hidden border border-neutral-800">
        <img src={safePoster} alt={title} className="w-full h-full object-cover opacity-70" />
        <button
          onClick={() => setIsStarted(true)}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition"
        >
          <Play className="w-8 h-8 fill-white ml-1" />
        </button>
      </div>
    );
  }

  // 1. YouTube Source Player
  if (resolvedSourceType === 'youtube') {
    return (
      <div className="relative w-full aspect-video rounded-3xl bg-black overflow-hidden border border-neutral-800 group">
        {/* MK HERO MOVIES Watermark Badge Overlay */}
        <div className="absolute top-3 right-3 z-30 px-3 py-1 rounded-xl bg-black/80 border border-red-600/40 text-white font-black text-[10px] tracking-wider uppercase flex items-center gap-1.5 shadow-2xl backdrop-blur-md pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span>MK HERO MOVIES</span>
        </div>
        <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
          <div
            ref={plyrContainerRef}
            className="plyr__video-embed w-full h-full"
            data-plyr-provider="youtube"
            data-plyr-embed-id={extractYouTubeId(url) || url}
          />
          {/* Top gradient shield */}
          <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-20" />
          {/* Bottom logo mask shield */}
          <div className="absolute bottom-0 right-0 w-32 h-10 bg-black/90 pointer-events-none z-20 rounded-tl-xl" />
        </div>
      </div>
    );
  }

  // 2. Bunny Stream Source Player
  if (resolvedSourceType === 'bunny') {
    return (
      <div className="relative w-full aspect-video rounded-3xl bg-black overflow-hidden border border-neutral-800">
        <iframe
          src={getBunnyEmbedUrl(url, autoplay)}
          title={title}
          className="w-full h-full border-0 relative z-10"
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // 3. MP4 / HLS HTML5 Video Tag
  return (
    <div className="relative w-full aspect-video rounded-3xl bg-black overflow-hidden border border-neutral-800">
      <video
        ref={videoRef}
        poster={safePoster || undefined}
        controls
        autoPlay={autoplay}
        playsInline
        onEnded={onEnded}
        onError={() => {
          const err = 'Video ntiyafungutse. Gerageza ahandi urebera.';
          setHasError(true);
          setErrorMessage(err);
          if (onError) onError(err);
        }}
        className="w-full h-full object-contain"
      />
    </div>
  );
};
export default VideoPlayer;
