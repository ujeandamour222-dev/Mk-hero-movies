import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Toast: React.FC = () => {
  const { toast } = useAuth();

  if (!toast) return null;

  const borderColors = {
    success: 'border-[#25D366] text-[#25D366]',
    error: 'border-[#e50914] text-[#e50914]',
    warning: 'border-[#ff9800] text-[#ff9800]',
  };

  return (
    <div className="fixed top-[80px] left-1/2 -translate-x-1/2 z-[2000] max-w-[90%] pointer-events-none animate-fade-in">
      <div className={`px-6 py-3.5 rounded-xl bg-[#1a1a1a] text-white border-2 font-bold text-sm shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-2 backdrop-blur-md ${borderColors[toast.type || 'success']}`}>
        <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}</span>
        <span className="text-white">{toast.message}</span>
      </div>
    </div>
  );
};
