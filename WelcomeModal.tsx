import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Play, UserPlus, X, Film, Check } from 'lucide-react';

export const WelcomeModal: React.FC = () => {
  const { setAuthModalOpen, setAuthModalTab, setCurrentPage } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem('mk_welcome_dismissed') === 'true';
      if (!isDismissed) {
        // Delay slightly for smooth page entrance
        const timer = setTimeout(() => setIsOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('mk_welcome_dismissed', 'true');
      } catch {}
    }
    setIsOpen(false);
  };

  const handleRegisterClick = () => {
    handleClose();
    setAuthModalTab('register');
    setAuthModalOpen(true);
  };

  const handleBrowseMovies = () => {
    handleClose();
    setCurrentPage('movies');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#081a0e] via-neutral-900 to-[#051109] border-2 border-[#00A651] rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,166,81,0.3)] text-white overflow-hidden animate-scale-up">
        {/* Decorative Green Glow Orb */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00A651]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition border border-neutral-700/60 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Funga"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00A651] via-[#008f45] to-[#ffcc00] p-0.5 shadow-xl shadow-emerald-600/30 shrink-0 flex items-center justify-center">
            <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center text-[#00A651]">
              <Film className="w-7 h-7 text-[#00A651]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-[#00A651]/20 text-[#00A651] font-black text-[10px] tracking-widest border border-[#00A651]/30 uppercase">
                ICYAKIRA
              </span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mt-0.5">
              Murakaza Neza kuri <span className="text-[#00A651]">MK HERO MOVIES!</span>
            </h2>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="p-4 rounded-2xl bg-black/50 border border-emerald-500/30 space-y-2 mb-6">
          <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-medium">
            Reba filime nziza zisobanuwe mu Kinyarwanda no Made in Rwanda.
          </p>
          <p className="text-xs text-neutral-400 leading-normal">
            Kugira ngo utangire, kanda hano wiyandikishe cyangwa winjire muri konte yawe, cyangwa utangire kureba afilime muri aka kanya!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleRegisterClick}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#00A651] via-[#008f45] to-emerald-600 hover:from-emerald-500 hover:to-[#00A651] text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
          >
            <UserPlus className="w-5 h-5" />
            <span>📝 Iyandikishe / Injira Muri Konte</span>
          </button>

          <button
            onClick={handleBrowseMovies}
            className="w-full py-3 px-6 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <Play className="w-4 h-4 text-[#00A651] fill-[#00A651]" />
            <span>▶ Tangira Kureba Filime</span>
          </button>
        </div>

        {/* Don't Show Again Checkbox */}
        <label className="flex items-center gap-2.5 text-xs text-neutral-400 hover:text-neutral-200 cursor-pointer pt-2 border-t border-neutral-800/80">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-[#00A651] focus:ring-[#00A651] accent-[#00A651]"
          />
          <span className="font-semibold">Ntuzongere kanyereka iyi mbaza (Don't show again)</span>
        </label>
      </div>
    </div>
  );
};
