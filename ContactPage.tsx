import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/translations';
import { Mail, Phone, MapPin, Send, MessageCircle, CheckCircle } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { language } = useAuth();
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emailOrPhone, subject, message }),
      });

      setLoading(false);
      if (res.ok) {
        setSubmitted(true);
        setName('');
        setEmailOrPhone('');
        setSubject('');
        setMessage('');
      } else {
        alert('Failed to send message.');
      }
    } catch {
      setLoading(false);
      alert('Network error.');
    }
  };

  return (
    <div className="pb-24 pt-4 space-y-8 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white">{t('contactTitle', language)}</h1>
        <p className="text-xs text-neutral-400">
          Ufite ikibazo cyangwa inyunganizi? Duhamagare cyangwa utwandikire ubu.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-semibold">Telefone & WhatsApp</p>
              <p className="text-sm font-bold text-white">+250 780 000 000</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-semibold">Imeri (Email)</p>
              <p className="text-sm font-bold text-white">support@mkhero.com</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-semibold">Icyicaro (Location)</p>
              <p className="text-sm font-bold text-white">Kigali, Rwanda</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
          {submitted ? (
            <div className="p-8 text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Ubutumwa bwoherejwe!</h3>
              <p className="text-xs text-neutral-400">
                Murakoze kutwandikira. Tuguha igisubizo mu gihe gito cyane.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2 rounded-xl bg-neutral-800 text-white font-bold text-xs"
              >
                Andika ubundi butumwa
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">{t('name', language)}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">{t('emailOrPhone', language)}</label>
                <input
                  type="text"
                  required
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Intego (Subject)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Ubufasha bwa VIP MoMo"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">{t('message', language)}</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 transition disabled:opacity-50"
              >
                {loading ? 'Tegereza...' : t('sendMessage', language)}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
