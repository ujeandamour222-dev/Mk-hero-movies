import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone, Sparkles } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Hide banner if already installed or dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  // Hide if not installable and not iOS (e.g. desktop non-chromium or already handled)
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-16 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:max-w-md z-40 bg-neutral-900/95 backdrop-blur-md border border-red-600/40 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-fade-in text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-white truncate">MK HERO MOVIES App</h4>
              <span className="px-1.5 py-0.5 rounded-full bg-red-600/30 text-red-400 text-[10px] font-semibold border border-red-500/30">Free</span>
            </div>
            <p className="text-[11px] text-neutral-300 truncate mt-0.5">
              Shyira kuri Telefone - Install App
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          ) : isIOS ? (
            <button
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold text-xs border border-neutral-700 shadow-md transition active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Install iOS</span>
            </button>
          ) : null}

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Step-by-Step Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Shyira kuri iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                <p>Kanda buto ya <strong>Share (Sangira)</strong> munsi y'urukuta mu mushakashatsi wa Safari.</p>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-800/60 border border-neutral-700/50">
                <span className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                <p>Manuka hanyuma ukande kuri <strong>Add to Home Screen (Ongeraho kuri Mpagarara)</strong>.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white transition"
            >
              Yego, Nabyumvise (Got it)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
