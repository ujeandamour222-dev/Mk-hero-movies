import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Language } from '../types';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { sendWelcomeEmailNotification } from '../lib/emailNotification';
import { sendVisitorHeartbeat } from '../lib/visitorAnalytics';
import { auth, db } from '../lib/firebase';

export function formatRwandaPhoneNumber(input: string): string {
  if (!input) return '';
  if (input.includes('@')) return input.trim().toLowerCase();

  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('250')) {
    digits = digits.substring(3);
  }
  if (!digits.startsWith('0') && digits.length === 9) {
    digits = '0' + digits;
  }
  return digits;
}

export interface AuthContextType {
  user: UserProfile | null;
  isVip: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  login: (emailOrPhone: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, emailOrPhone: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  selectedContentId: string | null;
  setSelectedContentId: (id: string | null) => void;
  selectedContentType: 'movie' | 'series' | null;
  setSelectedContentType: (type: 'movie' | 'series' | null) => void;
  selectedCategorySlug: string | null;
  setSelectedCategorySlug: (slug: string | null) => void;
  activeEpisodeId: string | null;
  setActiveEpisodeId: (id: string | null) => void;
  activeSeasonNumber: number;
  setActiveSeasonNumber: (seasonNum: number) => void;
  activeEpisodeNumber: number;
  setActiveEpisodeNumber: (epNum: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;

  // Payment Modal State
  paymentModalOpen: boolean;
  setPaymentModalOpen: (open: boolean) => void;
  selectedPlan: { name: string; price: number; days: number } | null;
  openPaymentModal: (price: number, name: string, days: number) => void;
  closePaymentModal: () => void;

  // Subscription Status
  subscriptionStatus: 'active' | 'expired' | 'none';

  // Toast System
  toast: { message: string; type: 'success' | 'error' | 'warning' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;

  // Watchlist System
  watchlist: string[];
  toggleWatchlist: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('mk_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('mk_language') as Language) || 'rw';
  });

  const [currentPage, setCurrentPage] = useState<string>('home');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<'movie' | 'series' | null>(null);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [activeSeasonNumber, setActiveSeasonNumber] = useState<number>(1);
  const [activeEpisodeNumber, setActiveEpisodeNumber] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; days: number } | null>(null);

  // Toast System State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Watchlist System State
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mk_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleWatchlist = (id: string) => {
    let updated: string[];
    let isAdded = false;
    if (watchlist.includes(id)) {
      updated = watchlist.filter((item) => item !== id);
    } else {
      updated = [id, ...watchlist];
      isAdded = true;
    }
    setWatchlist(updated);
    localStorage.setItem('mk_watchlist', JSON.stringify(updated));
    showToast(
      isAdded ? '📌 Filime yayingowe muri Ibyo Nshimisheje (My List)!' : '🗑️ Filime yakuwe muri Ibyo Nshimisheje!',
      isAdded ? 'success' : 'warning'
    );
  };

  const isInWatchlist = (id: string) => watchlist.includes(id);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const openPaymentModal = (price: number, name: string, days: number) => {
    setSelectedPlan({ price, name, days });
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
  };

  // Compute Subscription Status
  let subscriptionStatus: 'active' | 'expired' | 'none' = 'none';
  if (user) {
    if (user.role === 'admin') {
      subscriptionStatus = 'active';
    } else if ((user as any).subscriptionExpiresAt) {
      const expTime = new Date((user as any).subscriptionExpiresAt).getTime();
      subscriptionStatus = expTime > Date.now() ? 'active' : 'expired';
    } else if ((user as any).status === 'active' || (user as any).isVip) {
      subscriptionStatus = 'active';
    }
  }

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('mk_language', lang);
  };

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const found = (data.users || []).find((u: UserProfile) => u.id === user.id);
        if (found) {
          setUser(found);
          localStorage.setItem('mk_user_profile', JSON.stringify(found));
        }
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  // Live Firestore listener for user data updates (roles, etc.)
  useEffect(() => {
    if (!user?.id) return;

    const userDocRef = doc(db, 'users', user.id);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const liveData = { id: snapshot.id, ...snapshot.data() } as UserProfile;
          setUser(liveData);
          localStorage.setItem('mk_user_profile', JSON.stringify(liveData));
        }
      },
      (error) => {
        console.warn('User live document snapshot listener warning:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  const saveToAllUsersList = async (newUser: UserProfile) => {
    try {
      let allUsers: UserProfile[] = [];
      const stored = localStorage.getItem('mk_all_users');
      if (stored) allUsers = JSON.parse(stored);

      if (!allUsers.some((u) => u.id === newUser.id || u.emailOrPhone === newUser.emailOrPhone)) {
        allUsers.push(newUser);
        localStorage.setItem('mk_all_users', JSON.stringify(allUsers));
      }

      if (db && newUser.id) {
        await setDoc(doc(db, 'users', newUser.id), newUser, { merge: true });
      }
    } catch (err) {
      console.warn('Failed to sync user profile:', err);
    }
  };

  const login = async (emailOrPhone: string, pass: string) => {
    try {
      const cleaned = formatRwandaPhoneNumber(emailOrPhone);
      let allUsers: UserProfile[] = [];
      try {
        const stored = localStorage.getItem('mk_all_users');
        if (stored) allUsers = JSON.parse(stored);
      } catch {}

      let found = allUsers.find(
        (u) =>
          u.emailOrPhone === cleaned ||
          u.emailOrPhone === emailOrPhone ||
          (cleaned.startsWith('07') && u.emailOrPhone && u.emailOrPhone.includes(cleaned.substring(2)))
      );

      if (!found) {
        found = {
          id: 'usr_' + Date.now(),
          name: cleaned.includes('@') ? cleaned.split('@')[0] : `Umukoresha (${cleaned})`,
          emailOrPhone: cleaned,
          role: cleaned === '0784717208' ? 'admin' : 'user',
          isVip: false,
          createdAt: new Date().toISOString().split('T')[0],
        };
      }

      setUser(found);
      localStorage.setItem('mk_user_profile', JSON.stringify(found));
      localStorage.setItem('mk_is_logged_in', 'true');
      await saveToAllUsersList(found);
      sendVisitorHeartbeat('home', undefined, undefined, found.name);

      setAuthModalOpen(false);
      showToast(`🎉 Winjira neza ${found.name}!`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  };

  const register = async (name: string, emailOrPhone: string, pass: string) => {
    try {
      const cleaned = formatRwandaPhoneNumber(emailOrPhone);
      if (!cleaned) {
        return { success: false, error: 'Andika telefone cyangwa email banzikora' };
      }

      const newUser: UserProfile = {
        id: 'usr_' + Date.now(),
        name: name.trim(),
        emailOrPhone: cleaned,
        role: cleaned === '0784717208' ? 'admin' : 'user',
        isVip: false,
        createdAt: new Date().toISOString().split('T')[0],
      };

      setUser(newUser);
      localStorage.setItem('mk_user_profile', JSON.stringify(newUser));
      localStorage.setItem('mk_is_logged_in', 'true');
      await saveToAllUsersList(newUser);
      sendVisitorHeartbeat('home', undefined, undefined, newUser.name);

      // Trigger automatic welcome email notification if user provided an email
      if (cleaned.includes('@')) {
        sendWelcomeEmailNotification(cleaned, name).catch(() => {});
        showToast(`📩 Notification email yoherejwe neza kuri ${cleaned}!`, 'success');
      } else {
        showToast(`🎉 Murakaza neza ${name}! Akawunti yawe yakozwe neza.`, 'success');
      }

      setAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const gUser = result.user;

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: gUser.uid,
          name: gUser.displayName || 'Google User',
          email: gUser.email || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Google sign in failed' };
      }

      setUser(data.user);
      localStorage.setItem('mk_user_profile', JSON.stringify(data.user));
      await saveToAllUsersList(data.user);

      if (gUser.email) {
        sendWelcomeEmailNotification(gUser.email, gUser.displayName || 'Google User').catch(() => {});
        showToast(`📩 Notification email yoherejwe neza kuri ${gUser.email}!`, 'success');
      }

      setAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      let msg = err?.message || 'Google sign in failed';
      if (err?.code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        msg = `Domain (${window.location.hostname}) needs to be authorized in Firebase Console > Authentication > Settings > Authorized domains.`;
      } else if (err?.code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        msg = 'Sign-in popup was closed before completing.';
      } else if (err?.code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        msg = 'Google provider is disabled in Firebase Console. Enable Google in Firebase Console > Authentication > Sign-in method.';
      }
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mk_user_profile');
    setCurrentPage('home');
  };

  // Everything is 100% free for all users in CineBeta mode
  const isVip = true;

  return (
    <AuthContext.Provider
      value={{
        user,
        isVip,
        language,
        setLanguage,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        currentPage,
        setCurrentPage,
        selectedContentId,
        setSelectedContentId,
        selectedContentType,
        setSelectedContentType,
        selectedCategorySlug,
        setSelectedCategorySlug,
        activeEpisodeId,
        setActiveEpisodeId,
        activeSeasonNumber,
        setActiveSeasonNumber,
        activeEpisodeNumber,
        setActiveEpisodeNumber,
        searchQuery,
        setSearchQuery,
        authModalOpen,
        setAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        paymentModalOpen,
        setPaymentModalOpen,
        selectedPlan,
        openPaymentModal,
        closePaymentModal,
        subscriptionStatus,
        toast,
        showToast,
        watchlist,
        toggleWatchlist,
        isInWatchlist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
