export type Language = 'rw' | 'en';

export interface UserProfile {
  id: string;
  name: string;
  emailOrPhone: string;
  role: 'user' | 'admin';
  isVip?: boolean;
  createdAt: string;
}

export type VideoSourceType = 'mp4' | 'hls' | 'youtube' | 'bunny' | 'embed' | 'direct' | string;

export interface VideoServer {
  id: string;
  serverName: string;
  serverUrl: string;
  quality: '360p' | '480p' | '720p' | '1080p' | '4K' | 'BYIKORA' | 'Auto' | string;
  type?: VideoSourceType;
  downloadEnabled?: boolean;
  downloadUrl?: string;
  createdAt?: string;
}

export interface Movie {
  id: string;
  title: string;
  slug: string;
  posterUrl: string;
  backdropUrl?: string;
  description: string;
  year: number;
  genre: string;
  country?: string;
  language?: string;
  duration?: string;
  rating?: string;
  featured?: boolean;
  trending?: boolean;
  status?: 'published' | 'draft';
  videoUrl?: string;
  servers?: VideoServer[];
  downloadUrl?: string;
  category?: string;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  duration?: string;
  videoUrl?: string;
  servers?: VideoServer[];
  downloadUrl?: string;
  createdAt?: string;
}

export interface Series {
  id: string;
  title: string;
  slug: string;
  posterUrl: string;
  backdropUrl?: string;
  description: string;
  year: number;
  genre: string;
  country?: string;
  language?: string;
  featured?: boolean;
  trending?: boolean;
  status?: 'published' | 'draft';
  category?: string;
  seasonsCount?: number;
  totalEpisodes?: number;
  episodes?: Episode[];
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  contentId: string;
  contentType: 'movie' | 'series';
  title: string;
  posterUrl: string;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  userId: string;
  contentId: string;
  contentType: 'movie' | 'series';
  title: string;
  posterUrl: string;
  progress: number;
  duration: number;
  lastPosition: number;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  emailOrPhone: string;
  subject: string;
  message: string;
  status?: 'unread' | 'read';
  createdAt: string;
}

export type AdType = 'preroll' | 'midroll' | 'postroll' | 'banner';

export interface Ad {
  id: string;
  title: string;
  type: AdType;
  mediaUrl: string;
  targetUrl?: string;
  position?: 'center' | 'bottom' | 'top';
  startTime?: number; // seconds when midroll triggers
  duration?: number; // duration in seconds
  enabled: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
