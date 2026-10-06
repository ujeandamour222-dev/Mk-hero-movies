import React from 'react';
import { useAuth } from '../context/AuthContext';

export const SubscriptionBanner: React.FC = () => {
  const { user, subscriptionStatus, openPaymentModal } = useAuth();

  if (!user || subscriptionStatus === 'none') return null;

  const isActive = subscriptionStatus === 'active';

  return (
    <div
      className={`sticky top-[72px] z-[99] px-4 py-2 text-center text-xs sm:text-sm font-bold shadow-md transition-colors ${
        isActive
          ? 'bg-gradient-to-r from-[#00A651] to-[#008f45] text-white'
          : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap font-sans select-none">
        <span>
          {isActive
            ? '✅ ABÒNEMAN YAWE IRAKORA (24H Active VIP) — Enjoy unlimited HD streaming!'
            : '⚠️ ABÒNEMAN YAWE YARANGIYE (Subscription Expired) — Please renew to watch all movies!'}
        </span>
        {!isActive && (
          <button
            onClick={() => openPaymentModal(500, 'VIP Access (24 Hours)', 1)}
            className="px-3.5 py-1.5 bg-white text-[#00A651] font-black text-xs rounded-xl uppercase hover:bg-neutral-100 transition transform active:scale-95 shadow cursor-pointer min-h-[36px]"
          >
            Komeza Abòneman (500 RWF)
          </button>
        )}
      </div>
    </div>
  );
};
