export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[\w-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match1 = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i
  );
  if (match1 && match1[1]) {
    return match1[1];
  }
  const match2 = trimmed.match(/img\.youtube\.com\/vi\/([\w-]{11})/i);
  if (match2 && match2[1]) {
    return match2[1];
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return !!extractYouTubeId(url);
}

export function getYouTubeEmbedUrl(urlOrId: string, autoplay = true): string {
  const ytId = extractYouTubeId(urlOrId) || urlOrId;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    cc_load_policy: '0',
    showinfo: '0',
    controls: '1',
    playsinline: '1',
    enablejsapi: '1',
    color: 'white',
    widget_referrer: typeof window !== 'undefined' ? window.location.origin : '',
  });
  return `https://www.youtube-nocookie.com/embed/${ytId}?${params.toString()}`;
}

export function getYouTubeThumbnailUrl(urlOrId: string): string {
  if (!urlOrId) return 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80';
  const ytId = extractYouTubeId(urlOrId);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }
  if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) {
    return urlOrId;
  }
  return 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80';
}

export function isBunnyUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('mediadelivery.net') || url.includes('b-cdn.net') || url.includes('bunny.net');
}

export function getBunnyEmbedUrl(urlOrId: string, autoplay = true): string {
  if (!urlOrId) return '';
  if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://')) {
    return urlOrId;
  }
  return `https://iframe.mediadelivery.net/embed/${urlOrId}?autoplay=${autoplay}`;
}

export function isHlsUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('.m3u8') || url.includes('m3u8=true');
}

export function detectVideoSourceType(
  url: string,
  explicitType?: string
): 'youtube' | 'bunny' | 'hls' | 'mp4' {
  if (
    explicitType === 'youtube' ||
    explicitType === 'bunny' ||
    explicitType === 'hls' ||
    explicitType === 'mp4'
  ) {
    return explicitType;
  }
  if (!url) return 'mp4';
  if (isYouTubeUrl(url)) return 'youtube';
  if (isHlsUrl(url)) return 'hls';
  if (isBunnyUrl(url)) return 'bunny';
  return 'mp4';
}

export function isPosterImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim();
  if (isYouTubeUrl(clean)) return false;
  return clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image/');
}

// Helper to normalize poster URL (if an old database record stored a YouTube watch URL as posterUrl)
export function getSafePosterUrl(posterUrl?: string, videoUrl?: string): string {
  if (posterUrl && isYouTubeUrl(posterUrl)) {
    return getYouTubeThumbnailUrl(posterUrl);
  }
  if (posterUrl && isPosterImageUrl(posterUrl)) {
    return posterUrl;
  }
  if (videoUrl && isYouTubeUrl(videoUrl)) {
    return getYouTubeThumbnailUrl(videoUrl);
  }
  return posterUrl || '';
}
