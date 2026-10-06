export interface AdConfig {
  id: string;
  title: string;
  type: 'preroll' | 'midroll' | 'banner' | 'popup' | 'watermark';
  position?: 'header' | 'player_top' | 'player_bottom' | 'above_related' | 'footer' | 'popup' | 'watermark';
  mediaUrl: string; // image URL or video URL
  thumbnailUrl?: string; // thumbnail image URL
  videoUrl?: string; // video clip MP4 URL
  targetUrl?: string; // click-through URL
  duration?: number; // duration in seconds
  skipAfter?: number; // seconds before skip button appears
  aspectRatio?: '16:9' | '9:16'; // 16:9 Landscape or 9:16 Vertical Shorts format
  enableAudio?: boolean; // enable audio/sound
  enabled: boolean;
  impressions?: number;
  createdAt?: string;
}

export interface AdSettings {
  prerollEnabled: boolean;
  midrollEnabled: boolean;
  bannerEnabled: boolean;
  popupEnabled: boolean;
  watermarkEnabled: boolean;
  midrollIntervalMinutes: number; // e.g. 10
}

export interface AdStats {
  totalViews: number;
  todayViews: number;
  estimatedRevenueUsd: number;
  freeUsersCount: number;
  premiumUsersCount: number;
}

const DEFAULT_ADS: AdConfig[] = [
  {
    id: 'ad_preroll_1',
    title: 'MTN MoMo 4G Special Offer',
    type: 'preroll',
    mediaUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    targetUrl: 'https://wa.me/250784717208',
    duration: 15,
    skipAfter: 5,
    enabled: true,
    impressions: 142,
  },
  {
    id: 'ad_midroll_1',
    title: 'Airtel Money Fast Cash Back',
    type: 'midroll',
    mediaUrl: 'https://images.unsplash.com/photo-1556742049-0a670f4a4591?w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0a670f4a4591?w=800&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    targetUrl: 'https://wa.me/250784717208',
    duration: 10,
    skipAfter: 3,
    enabled: true,
    impressions: 98,
  },
  {
    id: 'ad_banner_header',
    title: 'MK VIP Cinema Pass - 300 RWF Only',
    type: 'banner',
    position: 'header',
    mediaUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&q=80',
    targetUrl: 'https://wa.me/250784717208',
    enabled: true,
    impressions: 320,
  },
  {
    id: 'ad_banner_player_bottom',
    title: 'Inyarwanda Super Stream Promo',
    type: 'banner',
    position: 'player_bottom',
    mediaUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
    targetUrl: 'https://wa.me/250784717208',
    enabled: true,
    impressions: 210,
  },
  {
    id: 'ad_banner_above_related',
    title: 'Canal+ Agasobanuye Special',
    type: 'banner',
    position: 'above_related',
    mediaUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80',
    targetUrl: 'https://wa.me/250784717208',
    enabled: true,
    impressions: 180,
  },
  {
    id: 'ad_popup_1',
    title: 'Get Unlimited 24H VIP Cinema Access',
    type: 'popup',
    position: 'popup',
    mediaUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
    targetUrl: 'https://wa.me/250784717208',
    duration: 5,
    skipAfter: 3,
    enabled: true,
    impressions: 85,
  },
  {
    id: 'ad_watermark_1',
    title: 'MK HERO Watermark Overlay',
    type: 'watermark',
    position: 'watermark',
    mediaUrl: 'MK HERO MOVIES - AGASOBANUYE VIP',
    targetUrl: 'https://wa.me/250784717208',
    enabled: true,
    impressions: 450,
  },
];

const DEFAULT_SETTINGS: AdSettings = {
  prerollEnabled: true,
  midrollEnabled: true,
  bannerEnabled: true,
  popupEnabled: true,
  watermarkEnabled: true,
  midrollIntervalMinutes: 10,
};

export function getAds(): AdConfig[] {
  try {
    const raw = localStorage.getItem('mk_ads_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_ADS;
}

export function saveAds(ads: AdConfig[]): void {
  try {
    localStorage.setItem('mk_ads_config', JSON.stringify(ads));
  } catch {}
}

export function getAdSettings(): AdSettings {
  try {
    const raw = localStorage.getItem('mk_ad_settings');
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveAdSettings(settings: AdSettings): void {
  try {
    localStorage.setItem('mk_ad_settings', JSON.stringify(settings));
  } catch {}
}

export function getAdStats(): AdStats {
  const ads = getAds();
  const totalViews = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
  const estimatedRevenueUsd = Number((totalViews * 0.01).toFixed(2));

  let premiumUsersCount = 12;
  let freeUsersCount = 145;

  try {
    const rawUsers = localStorage.getItem('mk_all_users');
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        premiumUsersCount = users.filter((u: any) => u.isVip || u.role === 'admin').length || 12;
        freeUsersCount = Math.max(0, users.length - premiumUsersCount) || 145;
      }
    }
  } catch {}

  return {
    totalViews,
    todayViews: Math.round(totalViews * 0.28),
    estimatedRevenueUsd,
    freeUsersCount,
    premiumUsersCount,
  };
}

export function recordAdImpression(adId: string): void {
  const ads = getAds();
  const found = ads.find((a) => a.id === adId);
  if (found) {
    found.impressions = (found.impressions || 0) + 1;
    saveAds(ads);
  }
}

/**
 * AdManager Utility Class
 * Handles retrieving, storing, toggling ad states (pre-roll, mid-roll, banners) in localStorage,
 * including toggling active/inactive ad positions and tracking statistics.
 */
export class AdManager {
  private static STORAGE_KEY_ADS = 'mk_ads_config';
  private static STORAGE_KEY_SETTINGS = 'mk_ad_settings';

  public static getAds(): AdConfig[] {
    return getAds();
  }

  public static saveAds(ads: AdConfig[]): void {
    saveAds(ads);
  }

  public static getSettings(): AdSettings {
    return getAdSettings();
  }

  public static saveSettings(settings: AdSettings): void {
    saveAdSettings(settings);
  }

  public static toggleAdStatus(adId: string): boolean {
    const ads = this.getAds();
    const target = ads.find((a) => a.id === adId);
    if (target) {
      target.enabled = !target.enabled;
      this.saveAds(ads);
      return target.enabled;
    }
    return false;
  }

  public static toggleAdSetting(key: keyof AdSettings, val?: boolean | number): boolean {
    const settings = this.getSettings();
    if (typeof val === 'undefined' && typeof settings[key] === 'boolean') {
      (settings[key] as boolean) = !(settings[key] as boolean);
    } else if (typeof val !== 'undefined') {
      (settings[key] as any) = val;
    }
    this.saveSettings(settings);
    return Boolean(settings[key]);
  }

  public static getActiveAdsByType(type: 'preroll' | 'midroll' | 'banner' | 'popup' | 'watermark'): AdConfig[] {
    const settings = this.getSettings();
    if (type === 'preroll' && !settings.prerollEnabled) return [];
    if (type === 'midroll' && !settings.midrollEnabled) return [];
    if (type === 'banner' && !settings.bannerEnabled) return [];
    if (type === 'popup' && !settings.popupEnabled) return [];
    if (type === 'watermark' && !settings.watermarkEnabled) return [];

    return this.getAds().filter((a) => a.enabled && a.type === type);
  }

  public static getActiveAdsByPosition(position: string): AdConfig[] {
    const settings = this.getSettings();
    if (!settings.bannerEnabled) return [];
    return this.getAds().filter((a) => a.enabled && a.position === position);
  }

  public static recordImpression(adId: string): void {
    recordAdImpression(adId);
  }

  public static getStats(): AdStats {
    return getAdStats();
  }
}
