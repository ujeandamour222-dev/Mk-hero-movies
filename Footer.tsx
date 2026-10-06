import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const Footer: React.FC = () => {
  const { setCurrentPage } = useAuth();
  const [whatsappLink, setWhatsappLink] = useState('https://wa.me/250784717208');
  const [secretClickCount, setSecretClickCount] = useState(0);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data?.whatsappLink) {
            setWhatsappLink(data.whatsappLink);
          } else if (data?.contactPhone) {
            const cleanPhone = data.contactPhone.replace(/[^0-9]/g, '');
            setWhatsappLink(`https://wa.me/${cleanPhone}`);
          }
        }
      } catch {}
    }
    loadSettings();
  }, []);

  const handleSecretClick = () => {
    const nextCount = secretClickCount + 1;
    setSecretClickCount(nextCount);
    if (nextCount >= 3) {
      setCurrentPage('admin');
      setSecretClickCount(0);
    }
  };

  return (
    <footer className="relative z-10 text-center py-12 px-5 bg-[#0a0a0a] text-[#666] border-t-2 border-[#00A651] mt-16 font-sans select-none">
      <div className="text-3xl font-black mb-3 tracking-wider uppercase">
        <span className="bg-gradient-to-r from-[#ffcc00] via-yellow-400 to-emerald-300 bg-clip-text text-transparent">
          MK HERO
        </span>{' '}
        <span className="text-[#00A651]">MOVIES</span>
      </div>
      <p className="text-base text-neutral-300 font-medium mb-5">
        Twandikire kuri serivisi zose:
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-6 max-w-md mx-auto">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-7 py-3.5 bg-[#1a1a1a] text-[#25D366] hover:bg-[#25D366] hover:text-white border-2 border-[#333] hover:border-[#25D366] rounded-xl font-bold text-base transition duration-300 shadow transform hover:-translate-y-1 min-h-[44px] flex items-center justify-center"
        >
          💬 WhatsApp
        </a>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-7 py-3.5 bg-[#1a1a1a] text-[#00A651] hover:bg-[#00A651] hover:text-white border-2 border-[#333] hover:border-[#00A651] rounded-xl font-bold text-base transition duration-300 shadow transform hover:-translate-y-1 min-h-[44px] flex items-center justify-center"
        >
          🔧 Support
        </a>
      </div>

      <p className="text-xs text-neutral-500 font-mono flex items-center justify-center gap-2">
        <span>© 2026 MK HERO MOVIES. All rights reserved.</span>
        {/* Tiny Secret Admin Trigger in bottom left */}
        <span
          onClick={handleSecretClick}
          className="text-[10px] text-neutral-800 hover:text-emerald-900 cursor-pointer select-none"
          title="Secret Admin"
        >
          🛡️
        </span>
      </p>
      <p className="text-[11px] text-neutral-600 mt-2 font-mono">
        Powered by Atomic Payments & MK Cinema Engine
      </p>
    </footer>
  );
};
