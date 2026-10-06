import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAds, getAdSettings, recordAdImpression, AdConfig } from '../lib/adManager';
import { ExternalLink } from 'lucide-react';

interface BannerAdProps {
  position: 'header' | 'player_top' | 'player_bottom' | 'above_related' | 'footer';
  className?: string;
}

export const BannerAd: React.FC<BannerAdProps> = ({ position, className = '' }) => {
  const { user, selectedContentId } = useAuth();
  const [ad, setAd] = useState<AdConfig | null>(null);

  // Check VIP / Paid status
  const itemExpiry = selectedContentId ? localStorage.getItem(`subscriptionExpiry_${selectedContentId}`) : null;
  const globalExpiry = localStorage.getItem('subscriptionExpiry_global');
  const expTime = Number(itemExpiry || globalExpiry || 0);
  const isVIP = localStorage.getItem('mk_vip_active') === 'true' || expTime > Date.now() || user?.role === 'admin';

  useEffect(() => {
    if (isVIP) return; // VIP users get ZERO ADS!

    const settings = getAdSettings();
    if (!settings.bannerEnabled) return;

    const ads = getAds();
    const matching = ads.filter(
      (a) => a.enabled && a.type === 'banner' && (a.position === position || (!a.position && position === 'header'))
    );

    if (matching.length > 0) {
      // Pick random or first active banner for position
      const selected = matching[Math.floor(Math.random() * matching.length)];
      setAd(selected);
      recordAdImpression(selected.id);
    }
  }, [position, isVIP]);

  // If VIP user or no active banner for this position, render nothing
  if (isVIP || !ad) return null;

  return (
    <div className={`w-full my-4 flex flex-col items-center justify-center select-none ${className}`}>
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-emerald-500/40 rounded-2xl overflow-hidden shadow-xl group">
        {/* Top AD Badge */}
        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[9px] font-black text-amber-400 uppercase tracking-widest border border-amber-400/30">
          📢 ITANGAZO / AD
        </div>

        <a
          href={ad.targetUrl || 'https://wa.me/250784717208'}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative w-full h-24 sm:h-28 md:h-32 overflow-hidden"
        >
          <img
            src={ad.mediaUrl || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&q=80'}
            alt={ad.title}
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&q=80';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center p-4 sm:p-6">
            <div className="max-w-md space-y-1">
              <h4 className="text-xs sm:text-sm md:text-base font-black text-white group-hover:text-emerald-400 transition drop-shadow">
                {ad.title}
              </h4>
              <p className="text-[10px] sm:text-xs text-neutral-300 font-medium line-clamp-1 flex items-center gap-1">
                <span>Kanda hano umenye birambuye</span>
                <ExternalLink className="w-3 h-3 text-emerald-400" />
              </p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};
