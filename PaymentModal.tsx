import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Smartphone, CheckCircle2, ShieldCheck, Zap, ArrowLeft, Check } from 'lucide-react';

export const PaymentModal: React.FC = () => {
  const { paymentModalOpen, closePaymentModal, selectedPlan, user, selectedContentId, showToast, refreshUser } = useAuth();
  
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [selectedTier, setSelectedTier] = useState<1 | 2>(1);
  const [momoSmsInput, setMomoSmsInput] = useState('');
  const [isSubmittedSms, setIsSubmittedSms] = useState(false);

  useEffect(() => {
    const handleApproved = () => {
      showToast('🎉 Kwishyura kwawe kwemejwe na Admin! Filime irafungutse!', 'success');
      closePaymentModal();
    };
    window.addEventListener('mk-payment-approved', handleApproved);
    return () => window.removeEventListener('mk-payment-approved', handleApproved);
  }, [closePaymentModal, showToast]);

  const handleSubmitMomoSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!momoSmsInput.trim()) return;

    try {
      let pending = JSON.parse(localStorage.getItem('mk_pending_payments') || '[]');
      let cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.startsWith('250')) cleanPhone = cleanPhone.substring(3);
      const fullPhone = cleanPhone ? '0' + cleanPhone : '0788123456';

      pending.push({
        id: 'PAY-' + Date.now(),
        phone: fullPhone,
        amount: amount,
        movieId: selectedContentId || 'impumyi-part1',
        smsMessage: momoSmsInput,
        timestamp: new Date().toLocaleTimeString()
      });
      localStorage.setItem('mk_pending_payments', JSON.stringify(pending));
      showToast('✅ Ubutumwa bwa MoMo buhasohowe neza kwa Admin! Tegereza yemere...', 'success');
      setIsSubmittedSms(true);
    } catch {}
  };
  const [isDialed, setIsDialed] = useState(false);
  const [countdown, setCountdown] = useState(120);

  const merchantCode = '1115705';
  const planName = selectedPlan?.name || 'VIP Access (24 Hours)';

  // Sync state on open & prefill phone if available
  useEffect(() => {
    if (paymentModalOpen) {
      if (user?.emailOrPhone && !user.emailOrPhone.includes('@')) {
        let clean = user.emailOrPhone.replace(/\D/g, '');
        if (clean.startsWith('250')) clean = clean.substring(3);
        if (!clean.startsWith('0') && clean.length === 9) clean = '0' + clean;
        setPhone(clean);
      } else {
        setPhone('07');
      }
      setAmount(selectedPlan?.price || 300);
      setIsDialed(false);
      setCountdown(120);
      setSelectedTier(1);
    }
  }, [paymentModalOpen, selectedPlan, user]);

  // Countdown timer for user feedback (strictly visual, no auto-approval)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDialed && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDialed, countdown]);

  if (!paymentModalOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 10) {
      digits = digits.substring(0, 10);
    }
    setPhone(digits);
  };

  const handleAutofillUserPhone = () => {
    if (user?.emailOrPhone && !user.emailOrPhone.includes('@')) {
      let clean = user.emailOrPhone.replace(/\D/g, '');
      if (clean.startsWith('250')) clean = clean.substring(3);
      setPhone(clean);
      showToast('📱 Nimero yawe yahise yuzuzwa neza!', 'success');
    }
  };

  // Grant 24h Time-Based Access
  const handleSimulatedApproval = async () => {
    const hours = selectedPlan?.days ? selectedPlan.days * 24 : 24;
    const expiryTime = Date.now() + (hours * 60 * 60 * 1000);

    if (selectedContentId) {
      localStorage.setItem(`subscriptionExpiry_${selectedContentId}`, expiryTime.toString());
    }
    localStorage.setItem('subscriptionExpiry_global', expiryTime.toString());
    localStorage.setItem('mk_vip_active', 'true');

    showToast('Ubwishyu bwaguwe! Wabonye uburenganzira bwo kureba mu masaha 24!', 'success');
    if (refreshUser) await refreshUser();
    closePaymentModal();
  };

  // TIER 1: Trigger One-Click Dialer via window.location.href & Save to Pending Payments
  const handleOneClickPay = (e: React.FormEvent) => {
    e.preventDefault();
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('250')) digits = digits.substring(3);
    if (!digits.startsWith('0') && digits.length === 9) digits = '0' + digits;

    if (digits.length < 10) {
      showToast('⚠️ Nyamuneka andika nimero y\'i Rwanda yuzuye (urugero: 0788123456)', 'warning');
      return;
    }

    const fullPhone = digits;
    const ussdCode = `*182*8*1*${merchantCode}*${amount}#`;

    // 1. Save Pending Payment object with phone number for Admin Dashboard
    try {
      let pending = JSON.parse(localStorage.getItem('mk_pending_payments') || '[]');
      pending.push({
        id: 'PAY-' + Date.now(),
        phone: fullPhone,
        amount: amount,
        movieId: selectedContentId || 'impumyi-part1',
        timestamp: new Date().toLocaleTimeString('rw-RW', { hour: '2-digit', minute: '2-digit' })
      });
      localStorage.setItem('mk_pending_payments', JSON.stringify(pending));
    } catch (err) {
      console.error(err);
    }

    // 2. Trigger Phone Dialer
    window.location.href = `tel:${encodeURIComponent(ussdCode)}`;

    // 3. Transition UI to Success / Dialed Screen
    setIsDialed(true);
    setCountdown(120);
    showToast('✅ Code yoherejwe! Kanda Call kuri telefoni yawe ugerageze kwishyura.', 'success');
  };

  const handleAutomaticPay = () => {
    showToast('Iyi serivisi irategurwa, koresha One-Click ubu.', 'warning');
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#00381b] via-[#007034] to-[#012411] border-2 border-[#ffcc00] text-white shadow-[0_0_60px_rgba(0,200,83,0.4)] overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={closePaymentModal}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-neutral-300 hover:text-white transition cursor-pointer z-20 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          ✕
        </button>

        {/* Tier Selection Switch */}
        <div className="mb-5 p-1 rounded-2xl bg-black/50 border border-emerald-500/30 flex items-center text-xs font-extrabold">
          <button
            onClick={() => setSelectedTier(1)}
            className={`flex-1 py-2.5 rounded-xl transition cursor-pointer min-h-[44px] ${
              selectedTier === 1
                ? 'bg-[#00A651] text-white shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            One-Click MoMo ✓
          </button>

          <button
            onClick={() => {
              setSelectedTier(2);
              handleAutomaticPay();
            }}
            className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 min-h-[44px] ${
              selectedTier === 2
                ? 'bg-[#00A651] text-white shadow-md font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Automatic 🔄</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] border border-amber-500/30">
              Vuba
            </span>
          </button>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* STATE 1: ONE-CLICK FORM                                              */}
        {/* ------------------------------------------------------------------- */}
        {!isDialed && selectedTier === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-[#ffcc00]" />
                <span>ONE-CLICK USSD CHECKOUT</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Kwishyura <span className="text-[#ffcc00]">{planName}</span>
              </h2>
              <p className="text-xs text-emerald-100">
                Shyura {amount} RWF kugira ngo urebe iyi filime mu masaha 24.
              </p>
            </div>

            {/* Merchant Code Box */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  Code
                </div>
                <div>
                  <p className="text-[10px] text-emerald-300 uppercase font-bold">Merchant Code</p>
                  <p className="font-mono font-black text-[#ffcc00] text-sm">{merchantCode}</p>
                </div>
              </div>
              <span className="text-[10px] text-emerald-200 font-mono bg-black/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                *182*8*1*{merchantCode}#
              </span>
            </div>

            <form onSubmit={handleOneClickPay} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-emerald-200 uppercase">
                    Nimero ya Telefone (urugero: 0788123456) *
                  </label>
                  {user?.emailOrPhone && !user.emailOrPhone.includes('@') && (
                    <button
                      type="button"
                      onClick={handleAutofillUserPhone}
                      className="text-[11px] font-bold text-amber-300 hover:text-white underline transition cursor-pointer"
                    >
                      📱 Uzuzamo Nimero Yawe
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    pattern="[0-9]*"
                    autoFocus
                    required
                    maxLength={10}
                    placeholder="0788123456"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full px-4 py-3.5 rounded-2xl bg-black/80 border-2 border-emerald-500/70 text-white font-mono text-lg font-black outline-none focus:border-[#ffcc00] focus:ring-4 focus:ring-[#ffcc00]/30 transition"
                  />
                  {phone.length >= 3 && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      {phone.includes('078') || phone.includes('079') || phone.includes('78') || phone.includes('79') ? (
                        <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-black text-[10px] border border-yellow-500/40">
                          🟡 MTN MoMo
                        </span>
                      ) : phone.includes('072') || phone.includes('073') || phone.includes('72') || phone.includes('73') ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-black text-[10px] border border-red-500/40">
                          🔴 Airtel Money
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-emerald-200 uppercase mb-1.5">
                  Igiciro CYO KWISHYURA (RWF)
                </label>
                <input
                  type="number"
                  required
                  readOnly
                  value={amount}
                  className="w-full px-4 py-3 rounded-2xl bg-black/50 border border-emerald-500/40 text-[#ffcc00] font-mono font-black text-base outline-none cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#ffcc00] hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider shadow-2xl transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Smartphone className="w-5 h-5 text-black" />
                <span>💳 KWISHYURA MOMO ({amount} RWF)</span>
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-[#ffcc00]" />
              <span>Amasaha 24 Access Guaranteed</span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* STATE 2: AUTOMATIC STK PUSH PLACEHOLDER                            */}
        {/* ------------------------------------------------------------------- */}
        {!isDialed && selectedTier === 2 && (
          <div className="py-4 text-center space-y-5 animate-fade-in">
            <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 text-xs text-amber-200 space-y-2">
              <p className="font-bold text-amber-300">🚧 Automatic STK Push (Coming Soon):</p>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Iyi serivisi irategurwa vuba, koresha One-Click MoMo ubu.
              </p>
            </div>

            <button
              onClick={() => setSelectedTier(1)}
              className="w-full py-4 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-xl transition active:scale-95 cursor-pointer min-h-[44px]"
            >
              Koresha One-Click MoMo Ubu
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* STATE 3: DIALED SUCCESS SCREEN                                      */}
        {/* ------------------------------------------------------------------- */}
        {isDialed && (
          <div className="py-4 text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#ffcc00] text-black flex items-center justify-center font-black text-2xl shadow-xl">
              ✓
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">Code Y'Ubwishyu Yoherejwe!</h3>
              <p className="text-xs text-emerald-100 max-w-xs mx-auto leading-relaxed">
                ✅ Nimero ya MoMo yoherejwe! Kanda <strong className="text-[#ffcc00]">Call</strong> wemeze na PIN. Nyuma yo kwishyura, copy / paste ubutumwa bwa MoMo hano munsi.
              </p>
              <p className="text-[11px] text-[#ffcc00] font-bold pt-1 animate-pulse">
                ⏳ Tegereje ko ushyiramo code y'ubutumwa bwa MoMo cyangwa Admin akabyemeza...
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-400/30 text-xs font-mono space-y-1 text-emerald-200">
              <p>Amasegonda: <strong className="text-[#ffcc00] text-sm">{countdown}s</strong></p>
            </div>

            {/* INPUT FORM FOR MOMO CONFIRMATION SMS / TXID */}
            {isSubmittedSms ? (
              <div className="p-4 rounded-2xl bg-[#00A651]/20 border-2 border-[#00A651] text-left space-y-2 animate-pulse">
                <div className="flex items-center gap-2 text-xs font-black text-[#ffcc00] uppercase">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>⏳ TEGEREZA ADMIN YEMEZE (AHO TEGEREZA)</span>
                </div>
                <p className="text-xs text-emerald-100 font-medium leading-relaxed">
                  Ubutumwa bwawe bwoherejwe neza kwa Admin! Nyamuneka tegereza gato muri aka kanya Admin yemeze kwishyura kwawe. Video igitangira kumanuka n'urukiko ruyifungura.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitMomoSms} className="p-4 rounded-2xl bg-black/60 border border-emerald-400/40 text-left space-y-2">
                <label className="block text-xs font-black text-[#ffcc00] uppercase">
                  🔑 SHYIRAMO CODE YO KWEMEZA UBWISHYU (TxID / SMS):
                </label>
                <textarea
                  rows={2}
                  placeholder="Shyiramo code yo kwemeza hano (e.g., TxID: 28471928374 cyangwa ubese ubutumwa bwa MoMo)..."
                  value={momoSmsInput}
                  onChange={(e) => setMomoSmsInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black border border-emerald-500/40 text-white font-mono text-xs outline-none focus:border-[#ffcc00]"
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer min-h-[44px]"
                >
                  📤 YOHEREZA CODE Y'UBWISHYU KWA ADMIN
                </button>
              </form>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSimulatedApproval}
                className="w-full py-3.5 rounded-2xl bg-[#ffcc00] hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-wider shadow-xl transition active:scale-95 cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simula Ubwishyu (Emeza Ubwo Bwije)</span>
              </button>

              <button
                onClick={() => setIsDialed(false)}
                className="text-xs text-emerald-300 hover:text-white underline font-medium transition flex items-center justify-center gap-1 mx-auto min-h-[44px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Guhindura Nimero</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
