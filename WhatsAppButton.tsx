import React from 'react';
import { MessageCircle } from 'lucide-react';

export const WhatsAppButton: React.FC = () => {
  const phone = '250784717208';
  const text = encodeURIComponent('Muraho MK HERO MOVIES, nkeneye ubufasha kuri afilime no kwishyura MoMo VIP.');
  const whatsappUrl = `https://wa.me/${phone}?text=${text}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 md:bottom-8 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs shadow-2xl shadow-emerald-600/40 border border-emerald-400/40 transition transform hover:scale-105 active:scale-95"
    >
      <MessageCircle className="w-5 h-5 fill-white" />
      <span className="hidden sm:inline">WhatsApp Help (+250 784 717 208)</span>
    </a>
  );
};
