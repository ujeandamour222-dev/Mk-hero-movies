import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAds, getAdSettings, recordAdImpression, AdConfig } from '../lib/adManager';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';

export const PopupAdModal: React.FC = () => {
  const { user, selectedContentId } = useAuth();
  const [ad, setAd] = useState<AdConfig | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const [canClose, setCanClose] = useState<boolean>(false);

  // Check VIP / Paid status
  const itemExpiry = selectedContentId ? localStorage.getItem(`subscriptionExpiry_${selectedContentId}`) : null;
  const globalExpiry = localStorage.getItem('subscriptionExpiry_global');
  const expTime = Number(itemExpiry || globalExpiry || 0);
  const isVIP = localStorage.getItem('mk_vip_active') === 'true' || expTime > Date.now() || user?.role === 'admin';

  useEffect(() => {
    if (isVIP) return; // Zero ads for VIP users!

    const settings = getAdSettings();
    if (!settings.popupEnabled) return;

    const ads = getAds();
    const popupAd = ads.find((a) => a.enabled && a.type === 'popup');

    if (popupAd) {
      setAd(popupAd);
      setIsOpen(true);
      setCountdown(popupAd.duration || 5);
      setCanClose(false);
      recordAdImpression(popupAd.id);
    }
  }, [selectedContentId, isVIP]);

  // Countdown timer & close button enabler
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          const next = prev - 1;
          if (next <= (ad?.skipAfter || 2)) {
            setCanClose(true);
          }
          if (next <= 0) {
            setIsOpen(false);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown, ad]);

  if (isVIP || !isOpen || !ad) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-lg bg-neutral-900 border-2 border-emerald-500/60 rounded-3xl overflow-hidden shadow-2xl p-6 text-white space-y-4">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-500/30">
              📢 ITANGAZO / AD
            </span>
            <span className="text-xs font-mono text-neutral-400">
              Rizavaho mu: <strong className="text-emerald-400 font-black">{countdown}s</strong>
            </span>
          </div>

          {canClose ? (
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full bg-neutral-800 hover:bg-emerald-600 text-white transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Funga Itangazo"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <span className="text-[10px] text-neutral-500 font-mono italic">
              Tegereza {countdown}s...
            </span>
          )}
        </div>

        {/* Ad Media Display */}
        <a
          href={ad.targetUrl || 'https://wa.me/250784717208'}
          target="_blank"
          rel="noopener noreferrer"
          className="block group relative rounded-2xl overflow-hidden border border-neutral-800 max-h-64 sm:max-h-80"
        >
          <img
            src={ad.mediaUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80'}
            alt={ad.title}
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-4 flex flex-col justify-end">
            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-emerald-400 transition">
              {ad.title}
            </h3>
            <p className="text-xs text-emerald-300 font-bold flex items-center gap-1">
              <span>Kanda hano kureba serivisi</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </p>
          </div>
        </a>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Kora upgrade kuri VIP kugira ngo ukureho amatangazo yose!</span>
          </div>

          <a
            href={ad.targetUrl || 'https://wa.me/250784717208'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 text-center min-h-[44px] flex items-center justify-center gap-1"
          >
            <span>KUREBA SERIVISI</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
