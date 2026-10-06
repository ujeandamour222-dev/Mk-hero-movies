import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1000] max-w-md w-[92%] p-3.5 rounded-2xl bg-neutral-900/95 border-2 border-amber-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.4)] backdrop-blur-md animate-bounce font-sans">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
          <WifiOff className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 text-xs">
          <p className="font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
            <span>NTA MURONGO WA INTERINETI (OFFLINE)</span>
          </p>
          <p className="text-neutral-300 text-[11px] leading-tight mt-0.5 flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-[#00A651] shrink-0" />
            <span>Paje n'amafilime birabitswe muri cache (Offline Cached Mode Active).</span>
          </p>
        </div>
      </div>
    </div>
  );
};
