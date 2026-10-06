import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Movie, Series, Episode, Category, UserProfile, VideoServer, VideoSourceType } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  getAds,
  saveAds,
  getAdSettings,
  saveAdSettings,
  getAdStats,
  AdConfig,
  AdSettings,
} from '../lib/adManager';
import { getVisitorAnalytics } from '../lib/visitorAnalytics';
import {
  extractYouTubeId,
  isYouTubeUrl,
  getYouTubeThumbnailUrl,
  isPosterImageUrl,
} from '../lib/videoUtils';
import {
  Shield,
  Film,
  Tv,
  Grid,
  Users,
  Settings,
  Plus,
  Trash2,
  Edit,
  BarChart,
  Lock,
  Server,
  Zap,
  Sparkles,
  AlertTriangle,
  Mic,
  Mail,
  Image as ImageIcon,
} from 'lucide-react';
import {
  getEmailLogs,
  sendEmailNotification,
  sendWelcomeEmailNotification,
  sendPaymentApprovedEmailNotification,
  EmailLog,
} from '../lib/emailNotification';

export const AdminPage: React.FC = () => {
  const { user, setAuthModalOpen, setAuthModalTab } = useAuth();

  // Admin Password Gate State
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('mk_admin_unlocked') === 'true' || user?.role === 'admin';
  });

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput.trim() === 'admin123' || adminPasswordInput.trim() === '1234') {
      sessionStorage.setItem('mk_admin_unlocked', 'true');
      setIsAdminUnlocked(true);
    } else {
      alert('⚠️ Password si yo! Ongera ugerageze (Password: admin123).');
    }
  };

  const [activeTab, setActiveTab] = useState<
    'overview' | 'payments' | 'movies' | 'series' | 'translators' | 'servers' | 'ads' | 'categories' | 'users' | 'emails' | 'settings'
  >('overview');

  // Email Notifications State
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(() => getEmailLogs());
  const [customEmailTo, setCustomEmailTo] = useState('');
  const [customEmailName, setCustomEmailName] = useState('');
  const [customEmailSubject, setCustomEmailSubject] = useState('');
  const [customEmailBody, setCustomEmailBody] = useState('');

  const reloadEmailLogs = () => {
    setEmailLogs(getEmailLogs());
  };

  const handleSendCustomEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmailTo.trim() || !customEmailSubject.trim() || !customEmailBody.trim()) {
      alert('Nyamuneka uzuze email, subject n\'ubutumwa!');
      return;
    }

    const res = await sendEmailNotification({
      recipientEmail: customEmailTo.trim(),
      recipientName: customEmailName.trim() || 'Umukoresha',
      type: 'custom',
      subject: customEmailSubject.trim(),
      bodyText: customEmailBody.trim(),
    });

    if (res.success) {
      alert(res.message);
      setCustomEmailTo('');
      setCustomEmailName('');
      setCustomEmailSubject('');
      setCustomEmailBody('');
      reloadEmailLogs();
    } else {
      alert('⚠️ ' + res.message);
    }
  };

  // Translators (Abanditsi b'Agasobanuye) State
  const [translators, setTranslators] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('mk_translators');
      if (stored) return JSON.parse(stored);
    } catch {}
    return ['Rocky Kimomo', 'Junior Giti', 'Yaba', 'Sankara', 'Kazungu', 'Chris', 'Gahene'];
  });
  const [newTranslatorName, setNewTranslatorName] = useState('');

  const handleAddTranslator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTranslatorName.trim()) return;
    if (translators.includes(newTranslatorName.trim())) {
      alert('Uyu mwanditsi asanzwe arimo!');
      return;
    }
    const updated = [...translators, newTranslatorName.trim()];
    setTranslators(updated);
    localStorage.setItem('mk_translators', JSON.stringify(updated));
    setNewTranslatorName('');
  };

  const handleDeleteTranslator = (name: string) => {
    if (!confirm(`Ese urashaka gusiba ${name}?`)) return;
    const updated = translators.filter((t) => t !== name);
    setTranslators(updated);
    localStorage.setItem('mk_translators', JSON.stringify(updated));
  };

  // Stats
  const [stats, setStats] = useState({
    moviesCount: 0,
    seriesCount: 0,
    usersCount: 0,
    categoriesCount: 0,
    adsCount: 0,
  });

  // Movies State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  // Pending Payments State for Admin Approval
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);

  // Approved Unlocks & Revenue Stats State
  const [approvedUnlocksCount, setApprovedUnlocksCount] = useState<number>(() => {
    try {
      const count = localStorage.getItem('mk_approved_unlocks_count');
      return count !== null ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [approvedRevenueTotal, setApprovedRevenueTotal] = useState<number>(() => {
    try {
      const total = localStorage.getItem('mk_approved_revenue_total');
      return total !== null ? parseInt(total, 10) : 0;
    } catch {
      return 0;
    }
  });

  // Calculate Total Pending Revenue
  const totalPendingRevenue = pendingPayments.reduce((acc, p) => acc + (Number(p.amount) || 300), 0);

  // Live Visitor Analytics State
  const [visitorStats, setVisitorStats] = useState(() => getVisitorAnalytics());

  useEffect(() => {
    const interval = setInterval(() => {
      setVisitorStats(getVisitorAnalytics());
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const loadPendingPayments = () => {
    try {
      const raw = localStorage.getItem('mk_pending_payments');
      if (raw) setPendingPayments(JSON.parse(raw));
      else setPendingPayments([]);
    } catch {
      setPendingPayments([]);
    }
  };

  useEffect(() => {
    loadPendingPayments();
    const interval = setInterval(loadPendingPayments, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleApprovePayment = (id: string, movieId: string, amount: number = 300) => {
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
    if (movieId) {
      localStorage.setItem(`subscriptionExpiry_${movieId}`, expiryTime.toString());
    }
    localStorage.setItem('subscriptionExpiry_global', expiryTime.toString());
    localStorage.setItem('mk_vip_active', 'true');

    // Record approved unlock & revenue
    const nextCount = approvedUnlocksCount + 1;
    const nextRevenue = approvedRevenueTotal + (Number(amount) || 300);
    setApprovedUnlocksCount(nextCount);
    setApprovedRevenueTotal(nextRevenue);
    localStorage.setItem('mk_approved_unlocks_count', nextCount.toString());
    localStorage.setItem('mk_approved_revenue_total', nextRevenue.toString());

    try {
      let pending = JSON.parse(localStorage.getItem('mk_pending_payments') || '[]');
      pending = pending.filter((p: any) => p.id !== id);
      localStorage.setItem('mk_pending_payments', JSON.stringify(pending));
      setPendingPayments(pending);
      window.dispatchEvent(new Event('mk-payment-approved'));
    } catch {}

    alert('✅ Ubwishyu bwemejwe neza! Filime yafunguriwe umukiriya mu masaha 24!');
  };

  const handleRejectPayment = (id: string) => {
    try {
      let pending = JSON.parse(localStorage.getItem('mk_pending_payments') || '[]');
      pending = pending.filter((p: any) => p.id !== id);
      localStorage.setItem('mk_pending_payments', JSON.stringify(pending));
      setPendingPayments(pending);
    } catch {}
  };
  const [mTitle, setMTitle] = useState('');
  const [mSlug, setMSlug] = useState('');
  const [mPosterUrl, setMPosterUrl] = useState('');
  const [mBackdropUrl, setMBackdropUrl] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mYear, setMYear] = useState<number>(new Date().getFullYear());
  const [mGenre, setMGenre] = useState('Agasobanuye Action');
  const [mCountry, setMCountry] = useState('Rwanda');
  const [mLanguage, setMLanguage] = useState('Kinyarwanda');
  const [mDuration, setMDuration] = useState('1h 45m');
  const [mRating, setMRating] = useState('PG-13');
  const [mFeatured, setMFeatured] = useState(true);
  const [mTrending, setMTrending] = useState(false);
  const [mStatus, setMStatus] = useState<'published' | 'draft'>('published');
  const [mDownloadUrl, setMDownloadUrl] = useState('');

  // Poster image load error state for preview
  const [posterImageError, setPosterImageError] = useState(false);

  // Movie Servers List State
  const [mServers, setMServers] = useState<VideoServer[]>([
    {
      id: 'srv_1',
      serverName: 'Aho Mbere 1',
      serverUrl: '',
      type: 'youtube',
      quality: '720p',
      downloadEnabled: false,
      downloadUrl: '',
    },
  ]);

  // Series State
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);

  // Series Form Fields
  const [sTitle, setSTitle] = useState('');
  const [sPosterUrl, setSPosterUrl] = useState('');
  const [sBackdropUrl, setSBackdropUrl] = useState('');
  const [sDescription, setSDescription] = useState('');
  const [sYear, setSYear] = useState<number>(new Date().getFullYear());
  const [sGenre, setSGenre] = useState('Agasobanuye Drama');
  const [sCountry, setSCountry] = useState('Rwanda');
  const [sLanguage, setSLanguage] = useState('Kinyarwanda');
  const [sFeatured, setSFeatured] = useState(true);
  const [sTrending, setSTrending] = useState(false);
  const [sStatus, setSStatus] = useState<'published' | 'draft'>('published');

  // Episode Form State
  const [selectedSeriesForEp, setSelectedSeriesForEp] = useState<Series | null>(null);
  const [showEpModal, setShowEpModal] = useState(false);
  const [epTitle, setEpTitle] = useState('');
  const [epSeasonNum, setEpSeasonNum] = useState<number>(1);
  const [epNum, setEpNum] = useState<number>(1);
  const [epVideoUrl, setEpVideoUrl] = useState('');
  const [epType, setEpType] = useState<VideoSourceType>('youtube');
  const [epDuration, setEpDuration] = useState('45m');
  const [epThumbnail, setEpThumbnail] = useState('');
  const [epDownloadUrl, setEpDownloadUrl] = useState('');

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [uName, setUName] = useState('');
  const [uEmailOrPhone, setUEmailOrPhone] = useState('');
  const [uRole, setURole] = useState<'user' | 'admin'>('user');
  const [uIsVip, setUIsVip] = useState(true);

  // Load Real Users Data from Firestore & Local Storage
  const loadUsersData = async () => {
    try {
      let realUsersList: UserProfile[] = [];

      // 1. Fetch real Firestore user documents
      if (db) {
        try {
          const snapshot = await getDocs(collection(db, 'users'));
          snapshot.forEach((d) => {
            if (d.exists()) {
              realUsersList.push({ id: d.id, ...d.data() } as UserProfile);
            }
          });
        } catch (err) {
          console.warn('Firestore users fetch warning:', err);
        }
      }

      // 2. Combine with localStorage users
      const rawStored = localStorage.getItem('mk_all_users');
      if (rawStored) {
        const storedUsers = JSON.parse(rawStored);
        if (Array.isArray(storedUsers)) {
          storedUsers.forEach((u) => {
            if (u && u.id && !realUsersList.some((existing) => existing.id === u.id)) {
              realUsersList.push(u);
            }
          });
        }
      }

      // 3. Include current logged-in user profile
      const rawProfile = localStorage.getItem('mk_user_profile');
      if (rawProfile) {
        const currentProf = JSON.parse(rawProfile);
        if (currentProf && currentProf.id && !realUsersList.some((u) => u.id === currentProf.id)) {
          realUsersList.push(currentProf);
        }
      }

      // Ensure Admin user (Jean D'Amour) is always present
      if (!realUsersList.some((u) => u.role === 'admin' || u.emailOrPhone === '0784717208')) {
        realUsersList.unshift({
          id: 'usr_admin',
          name: 'Jean D\'Amour (Admin)',
          emailOrPhone: '0784717208',
          role: 'admin',
          isVip: true,
          createdAt: new Date().toISOString().split('T')[0],
        });
      }

      // Normalize user profiles to prevent undefined property errors
      realUsersList = realUsersList.map((u) => ({
        id: u.id || 'usr_' + Math.random().toString(36).substring(2, 9),
        name: u.name || 'Umukoresha',
        emailOrPhone: u.emailOrPhone || u.id || 'Nta Nimero',
        role: u.role || (u.emailOrPhone === '0784717208' ? 'admin' : 'user'),
        isVip: !!u.isVip || u.role === 'admin',
        createdAt: u.createdAt || new Date().toISOString().split('T')[0],
      }));

      setUsers(realUsersList);
      localStorage.setItem('mk_all_users', JSON.stringify(realUsersList));
      setStats((prev) => ({ ...prev, usersCount: realUsersList.length }));
    } catch (err) {
      console.error('Error loading real users:', err);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName.trim() || !uEmailOrPhone.trim()) {
      alert('Nyamuneka uzuze izina na telefone/imeri!');
      return;
    }

    const newUser: UserProfile = {
      id: 'usr_' + Date.now(),
      name: uName.trim(),
      emailOrPhone: uEmailOrPhone.trim(),
      role: uRole,
      isVip: uIsVip,
      createdAt: new Date().toISOString().split('T')[0],
    };

    try {
      if (db) {
        await setDoc(doc(db, 'users', newUser.id), newUser);
      }
    } catch {}

    const updated = [newUser, ...users];
    setUsers(updated);
    localStorage.setItem('mk_all_users', JSON.stringify(updated));

    setShowAddUserModal(false);
    setUName('');
    setUEmailOrPhone('');
    alert('✅ Umukoresha mushya yiyandikishije neza!');
  };

  useEffect(() => {
    loadAllData();
    loadUsersData();
  }, []);

  const handleToggleUserVip = (userId: string) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextVip = !u.isVip;
        if (nextVip) {
          const expiryTime = Date.now() + 24 * 60 * 60 * 1000;
          localStorage.setItem('subscriptionExpiry_global', expiryTime.toString());
          localStorage.setItem('mk_vip_active', 'true');
        }
        return { ...u, isVip: nextVip };
      }
      return u;
    });

    setUsers(updated);
    localStorage.setItem('mk_all_users', JSON.stringify(updated));
    alert('✅ VIP status y\'umukoresha yahinduwe neza!');
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Ese urashaka gusiba uyu mukoresha?')) return;
    const updated = users.filter((u) => u && u.id !== userId);
    setUsers(updated);
    localStorage.setItem('mk_all_users', JSON.stringify(updated));

    if (db && userId) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        console.warn('Firestore user delete error:', err);
      }
    }
    alert('✅ Umukoresha wasibiwe neza burundu!');
  };

  const loadAllData = async () => {
    try {
      const [mRes, sRes, cRes, uRes, aRes] = await Promise.all([
        fetch('/api/movies'),
        fetch('/api/series'),
        fetch('/api/categories'),
        fetch('/api/users'),
        fetch('/api/ads'),
      ]);

      if (mRes.ok) {
        const d = await mRes.json().catch(() => ({}));
        setMovies(d.movies || []);
        setStats((prev) => ({ ...prev, moviesCount: (d.movies || []).length }));
      }
      if (sRes.ok) {
        const d = await sRes.json().catch(() => ({}));
        setSeriesList(d.series || []);
        setStats((prev) => ({ ...prev, seriesCount: (d.series || []).length }));
      }
      if (cRes.ok) {
        const d = await cRes.json().catch(() => ({}));
        setCategories(d.categories || []);
        setStats((prev) => ({ ...prev, categoriesCount: (d.categories || []).length }));
      }
      if (uRes.ok) {
        const d = await uRes.json().catch(() => ({}));
        setUsers(d.users || []);
        setStats((prev) => ({ ...prev, usersCount: (d.users || []).length }));
      }
      if (aRes.ok) {
        const d = await aRes.json().catch(() => ({}));
        setAdsList(d.ads || []);
        setStats((prev) => ({ ...prev, adsCount: (d.ads || []).length }));
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    }
  };

  // Movie Handlers
  const openNewMovieModal = () => {
    setEditingMovie(null);
    setMTitle('');
    setMSlug('');
    setMPosterUrl('');
    setMBackdropUrl('');
    setMDescription('');
    setMYear(new Date().getFullYear());
    setMGenre('Agasobanuye Action');
    setMCountry('Rwanda');
    setMLanguage('Kinyarwanda');
    setMDuration('2h 15m');
    setMRating('PG-13');
    setMFeatured(true);
    setMTrending(false);
    setMStatus('published');
    setMDownloadUrl('');
    setPosterImageError(false);
    setMServers([
      {
        id: 'srv_1',
        serverName: 'Aho Mbere 1',
        serverUrl: '',
        type: 'youtube',
        quality: '720p',
        downloadEnabled: false,
        downloadUrl: '',
      },
    ]);
    setShowMovieModal(true);
  };

  const openEditMovieModal = (m: Movie) => {
    setEditingMovie(m);
    setMTitle(m.title);
    setMSlug(m.slug || '');
    setMPosterUrl(m.posterUrl || '');
    setMBackdropUrl(m.backdropUrl || '');
    setMDescription(m.description || '');
    setMYear(m.year || new Date().getFullYear());
    setMGenre(m.genre || m.category || 'Agasobanuye Action');
    setMCountry(m.country || 'Rwanda');
    setMLanguage(m.language || 'Kinyarwanda');
    setMDuration(m.duration || '1h 45m');
    setMRating(m.rating || 'PG-13');
    setMFeatured(m.featured ?? true);
    setMTrending(m.trending ?? false);
    setMStatus(m.status || 'published');
    setMDownloadUrl(m.downloadUrl || '');
    setPosterImageError(false);

    setMServers(
      m.servers && m.servers.length > 0
        ? m.servers
        : [
            {
              id: 'srv_1',
              serverName: 'Aho Mbere 1',
              serverUrl: m.videoUrl || '',
              type: isYouTubeUrl(m.videoUrl || '') ? 'youtube' : 'mp4',
              quality: '720p',
              downloadEnabled: !!m.downloadUrl,
              downloadUrl: m.downloadUrl || '',
            },
          ]
    );
    setShowMovieModal(true);
  };

  // SHAKA IFOTO YA YOUTUBE Helper
  const handleAutoExtractYouTubeThumbnail = () => {
    const firstServerUrl = mServers[0]?.serverUrl || '';
    const ytId = extractYouTubeId(firstServerUrl) || extractYouTubeId(mPosterUrl);

    if (ytId) {
      const thumbUrl = getYouTubeThumbnailUrl(ytId);
      setMPosterUrl(thumbUrl);
      if (!mBackdropUrl) setMBackdropUrl(thumbUrl);
      setPosterImageError(false);
    } else {
      alert('Nta URL ya YouTube iboneka mu murongo wa video.');
    }
  };

  const handleAddServerField = () => {
    const nextIdx = mServers.length + 1;
    setMServers([
      ...mServers,
      {
        id: `srv_${Date.now()}_${nextIdx}`,
        serverName: nextIdx === 2 ? 'Aho Kabiri 2' : `Aho Mbere ${nextIdx}`,
        serverUrl: '',
        type: 'youtube',
        quality: '720p',
        downloadEnabled: false,
        downloadUrl: '',
      },
    ]);
  };

  const handleUpdateServerField = (index: number, key: keyof VideoServer, val: any) => {
    const updated = [...mServers];
    updated[index] = { ...updated[index], [key]: val };

    // Auto detect type if URL changes
    if (key === 'serverUrl' && typeof val === 'string') {
      if (isYouTubeUrl(val)) {
        updated[index].type = 'youtube';
      } else if (val.includes('.m3u8')) {
        updated[index].type = 'hls';
      } else if (val.includes('mediadelivery.net') || val.includes('b-cdn.net')) {
        updated[index].type = 'bunny';
      } else if (val.endsWith('.mp4')) {
        updated[index].type = 'mp4';
      }
    }

    setMServers(updated);
  };

  const handleRemoveServerField = (index: number) => {
    if (mServers.length === 1) return;
    setMServers(mServers.filter((_, i) => i !== index));
  };

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Block saving if YouTube watch URL is in poster field!
    if (isYouTubeUrl(mPosterUrl)) {
      alert('⚠️ Iyi ni URL ya video, si URL y\'ifoto. Koresha butani "SHAKA IFOTO YA YOUTUBE".');
      return;
    }

    const primaryVideoUrl = mServers[0]?.serverUrl || '';

    const payload = {
      title: mTitle,
      slug: mSlug || mTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      posterUrl: mPosterUrl,
      backdropUrl: mBackdropUrl || mPosterUrl,
      description: mDescription,
      year: Number(mYear),
      genre: mGenre,
      country: mCountry,
      language: mLanguage,
      duration: mDuration,
      rating: mRating,
      featured: mFeatured,
      trending: mTrending,
      status: mStatus,
      videoUrl: primaryVideoUrl,
      downloadUrl: mDownloadUrl,
      servers: mServers,
      category: mGenre,
    };

    try {
      const url = editingMovie ? `/api/movies/${editingMovie.id}` : '/api/movies';
      const method = editingMovie ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowMovieModal(false);
        loadAllData();
      } else {
        alert('HABAYE IKIBAZO mu kubika film.');
      }
    } catch {
      alert('HABAYE IKIBAZO cy\'umuryango (Network error).');
    }
  };

  const handleDeleteMovie = async (id: string) => {
    if (!confirm('Ese urashaka gusiba iyi film?')) return;
    const updated = movies.filter((m) => m.id !== id);
    setMovies(updated);
    localStorage.setItem('mk_movies', JSON.stringify(updated));
    localStorage.setItem('mk_all_movies', JSON.stringify(updated));

    if (db && id) {
      try {
        await deleteDoc(doc(db, 'movies', id));
      } catch (err) {
        console.warn('Firestore movie delete error:', err);
      }
    }

    try {
      await fetch(`/api/movies/${id}`, { method: 'DELETE' });
    } catch {}

    alert('✅ Filime yasibiwe neza burundu!');
  };

  // Series Handlers
  const openNewSeriesModal = () => {
    setEditingSeries(null);
    setSTitle('');
    setSPosterUrl('');
    setSBackdropUrl('');
    setSDescription('');
    setSYear(new Date().getFullYear());
    setSGenre('Agasobanuye Drama');
    setSCountry('Rwanda');
    setSLanguage('Kinyarwanda');
    setSFeatured(true);
    setSTrending(false);
    setSStatus('published');
    setShowSeriesModal(true);
  };

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: sTitle,
      posterUrl: sPosterUrl,
      backdropUrl: sBackdropUrl || sPosterUrl,
      description: sDescription,
      year: Number(sYear),
      genre: sGenre,
      country: sCountry,
      language: sLanguage,
      featured: sFeatured,
      trending: sTrending,
      status: sStatus,
      category: sGenre,
    };

    try {
      const url = editingSeries ? `/api/series/${editingSeries.id}` : '/api/series';
      const method = editingSeries ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowSeriesModal(false);
        loadAllData();
      }
    } catch {}
  };

  const handleDeleteSeries = async (id: string) => {
    if (!confirm('Ese urashaka gusiba iyi series?')) return;
    const updated = seriesList.filter((s) => s.id !== id);
    setSeriesList(updated);
    localStorage.setItem('mk_series', JSON.stringify(updated));
    localStorage.setItem('mk_all_series', JSON.stringify(updated));

    if (db && id) {
      try {
        await deleteDoc(doc(db, 'series', id));
      } catch (err) {
        console.warn('Firestore series delete error:', err);
      }
    }

    try {
      await fetch(`/api/series/${id}`, { method: 'DELETE' });
    } catch {}

    alert('✅ Series yasibiwe neza burundu!');
  };

  // Episode Handlers
  const openAddEpisodeModal = (s: Series) => {
    setSelectedSeriesForEp(s);
    setEpTitle(`Igice cha ${(s.episodes?.length || 0) + 1}`);
    setEpSeasonNum(1);
    setEpNum((s.episodes?.length || 0) + 1);
    setEpVideoUrl('');
    setEpType('youtube');
    setEpDuration('45m');
    setEpThumbnail(s.posterUrl || '');
    setEpDownloadUrl('');
    setShowEpModal(true);
  };

  const handleSaveEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeriesForEp) return;

    const payload = {
      seriesId: selectedSeriesForEp.id,
      title: epTitle,
      seasonNumber: Number(epSeasonNum),
      episodeNumber: Number(epNum),
      videoUrl: epVideoUrl,
      duration: epDuration,
      thumbnailUrl: epThumbnail,
      downloadUrl: epDownloadUrl,
      servers: [
        {
          id: 'srv_ep_1',
          serverName: 'Aho Mbere 1',
          serverUrl: epVideoUrl,
          type: epType,
          quality: '720p',
          downloadEnabled: !!epDownloadUrl,
          downloadUrl: epDownloadUrl,
        },
      ],
    };

    try {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowEpModal(false);
        loadAllData();
      }
    } catch {}
  };

  const handleDeleteEpisode = async (id: string) => {
    if (!confirm('Ese urashaka gusiba iki gice?')) return;
    try {
      const res = await fetch(`/api/episodes/${id}`, { method: 'DELETE' });
      if (res.ok) loadAllData();
    } catch {}
  };

  // Ads Management State & Handlers
  const [adsList, setAdsList] = useState<AdConfig[]>(() => getAds());

  useEffect(() => {
    setStats({
      moviesCount: movies.length,
      seriesCount: seriesList.length,
      usersCount: users.length,
      categoriesCount: categories.length,
      adsCount: adsList.length,
    });
  }, [movies.length, seriesList.length, users.length, categories.length, adsList.length]);
  const [adSettings, setAdSettingsState] = useState<AdSettings>(() => getAdSettings());
  const [adStats, setAdStats] = useState(() => getAdStats());

  const [showAdModal, setShowAdModal] = useState(false);
  const [editingAd, setEditingAd] = useState<AdConfig | null>(null);

  const [adTitle, setAdTitle] = useState('');
  const [adType, setAdType] = useState<'preroll' | 'midroll' | 'banner' | 'popup' | 'watermark'>('preroll');
  const [adPosition, setAdPosition] = useState<'header' | 'player_top' | 'player_bottom' | 'above_related' | 'footer' | 'popup' | 'watermark'>('header');
  const [adMediaUrl, setAdMediaUrl] = useState('');
  const [adVideoUrl, setAdVideoUrl] = useState('');
  const [adTargetUrl, setAdTargetUrl] = useState('');
  const [adDuration, setAdDuration] = useState(15);
  const [adSkipAfter, setAdSkipAfter] = useState(5);
  const [adAspectRatio, setAdAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [adEnableAudio, setAdEnableAudio] = useState(true);
  const [adEnabled, setAdEnabled] = useState(true);

  const reloadAds = () => {
    const freshAds = getAds();
    const freshSettings = getAdSettings();
    const freshStats = getAdStats();
    setAdsList(freshAds);
    setAdSettingsState(freshSettings);
    setAdStats(freshStats);
  };

  const handleToggleAdSetting = (key: keyof AdSettings, val: any) => {
    const updated = { ...adSettings, [key]: val };
    setAdSettingsState(updated);
    saveAdSettings(updated);
  };

  const handleToggleAdActive = (adId: string) => {
    const updated = adsList.map((a) => (a.id === adId ? { ...a, enabled: !a.enabled } : a));
    setAdsList(updated);
    saveAds(updated);
  };

  const openNewAdModal = () => {
    setEditingAd(null);
    setAdTitle('');
    setAdType('preroll');
    setAdPosition('header');
    setAdMediaUrl('https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80');
    setAdVideoUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    setAdTargetUrl('https://wa.me/250784717208');
    setAdDuration(15);
    setAdSkipAfter(5);
    setAdAspectRatio('16:9');
    setAdEnableAudio(true);
    setAdEnabled(true);
    setShowAdModal(true);
  };

  const openEditAdModal = (ad: AdConfig) => {
    setEditingAd(ad);
    setAdTitle(ad.title);
    setAdType(ad.type || 'preroll');
    setAdPosition(ad.position || 'header');
    setAdMediaUrl(ad.mediaUrl || ad.thumbnailUrl || '');
    setAdVideoUrl(ad.videoUrl || '');
    setAdTargetUrl(ad.targetUrl || '');
    setAdDuration(ad.duration ?? 15);
    setAdSkipAfter(ad.skipAfter ?? 5);
    setAdAspectRatio(ad.aspectRatio || '16:9');
    setAdEnableAudio(ad.enableAudio ?? true);
    setAdEnabled(ad.enabled ?? true);
    setShowAdModal(true);
  };

  const handleSaveAd = (e: React.FormEvent) => {
    e.preventDefault();
    const newAd: AdConfig = {
      id: editingAd ? editingAd.id : 'ad_' + Date.now(),
      title: adTitle,
      type: adType,
      position: adPosition,
      mediaUrl: adMediaUrl,
      thumbnailUrl: adMediaUrl,
      videoUrl: adVideoUrl,
      targetUrl: adTargetUrl,
      duration: Number(adDuration),
      skipAfter: Number(adSkipAfter),
      aspectRatio: adAspectRatio,
      enableAudio: adEnableAudio,
      enabled: adEnabled,
      impressions: editingAd ? editingAd.impressions || 0 : 0,
    };

    let updated: AdConfig[];
    if (editingAd) {
      updated = adsList.map((a) => (a.id === editingAd.id ? newAd : a));
    } else {
      updated = [newAd, ...adsList];
    }

    setAdsList(updated);
    saveAds(updated);
    setShowAdModal(false);
    reloadAds();
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Ese urashaka gusiba iri tangazo?')) return;
    const updated = adsList.filter((a) => a.id !== id);
    setAdsList(updated);
    saveAds(updated);

    if (db && id) {
      try {
        await deleteDoc(doc(db, 'ads', id));
      } catch (err) {
        console.warn('Firestore ad delete error:', err);
      }
    }

    reloadAds();
    alert('✅ Itangazo ryasibiwe neza burundu!');
  };

  // Category Handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      if (res.ok) {
        setCatName('');
        setCatDesc('');
        loadAllData();
      }
    } catch {}
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Ese urashaka gusiba iki cyiciro?')) return;
    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    localStorage.setItem('mk_categories', JSON.stringify(updated));

    if (db && id) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (err) {
        console.warn('Firestore category delete error:', err);
      }
    }

    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    } catch {}

    alert('✅ Icyiciro cyasibiwe neza burundu!');
  };

  // User Role Toggle
  const toggleUserRole = async (userId: string, currentRole: 'admin' | 'user') => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    const updated = users.map((u) => (u.id === userId ? { ...u, role: nextRole as any } : u));
    setUsers(updated);
    localStorage.setItem('mk_all_users', JSON.stringify(updated));

    if (db && userId) {
      try {
        await setDoc(doc(db, 'users', userId), { role: nextRole }, { merge: true });
      } catch {}
    }
  };

  // Admin Secret Password Check
  if (!isAdminUnlocked) {
    return (
      <div className="py-20 px-4 max-w-md mx-auto text-center space-y-6 font-sans">
        <div className="w-20 h-20 rounded-full bg-[#00A651]/20 text-[#00A651] border-2 border-[#00A651]/50 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,166,81,0.4)]">
          <Lock className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            ADMIN DASHBOARD IBANGA
          </h1>
          <p className="text-xs text-emerald-200 mt-2">
            Injiza Password y'Ubuyobozi kugira ngo urebe ikibaho n'ubwishyu.
          </p>
        </div>

        <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
          <input
            type="password"
            required
            autoFocus
            placeholder="Password (e.g. admin123)"
            value={adminPasswordInput}
            onChange={(e) => setAdminPasswordInput(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl bg-neutral-900 border border-emerald-500/40 text-white font-mono text-center text-sm outline-none focus:border-[#00A651] transition shadow-inner"
          />
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-2xl transition transform active:scale-95 cursor-pointer min-h-[44px]"
          >
            🔓 KWINJIRA MURI ADMIN
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 space-y-8 max-w-7xl mx-auto px-2 sm:px-4 font-sans">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">UBUYOBORO (ADMIN)</h1>
            <p className="text-xs text-neutral-400">MK HERO MOVIES - Ikibaho cy'Ubuyobozi</p>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-800 scrollbar-none">
        {[
          { id: 'overview', label: 'AHABANZA', icon: BarChart },
          { id: 'payments', label: 'UBUTUMWA B\'UBWISHYU', icon: Zap, count: pendingPayments.length },
          { id: 'movies', label: 'AMA FILM', icon: Film },
          { id: 'series', label: 'SERIES', icon: Tv },
          { id: 'translators', label: 'ABANDITSI', icon: Mic },
          { id: 'servers', label: 'AHO VIDEO IBARIZWA', icon: Server },
          { id: 'ads', label: 'AMATANGAZO', icon: Zap },
          { id: 'categories', label: 'IBYICIRO', icon: Grid },
          { id: 'users', label: 'ABAKORESHA', icon: Users },
          { id: 'emails', label: 'EMAILS & NOTIFICATIONS', icon: Mail },
          { id: 'settings', label: 'IGENAMITERERE', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'users') {
                  loadUsersData();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs shrink-0 transition cursor-pointer relative ${
                isActive
                  ? 'bg-[#00A651] text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white hover:border-neutral-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black animate-pulse">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: AHABANZA */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* REVENUE & APPROVED MOVIE UNLOCKS SUMMARY STATS WIDGET */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-black border-2 border-emerald-500/40 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    💰 IBIBAHO BY'UBWISHYU N'INYUNGU (REVENUE & UNLOCKS WIDGET)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Akayabo k'ubwishyu buri gutegerezwa n'umubare w'amafilime amaze kufungurwa neza.
                  </p>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-black">
                📊 MoMo Merchant Rate: 100%
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans">
              {/* Card 1: Total Pending Revenue */}
              <div className="p-5 rounded-2xl bg-black/60 border border-amber-500/50 space-y-2 relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs font-black text-amber-400 uppercase tracking-wider">
                  <span>Amafaranga Buri Gutegerezwa</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-amber-400 font-mono">
                    {totalPendingRevenue.toLocaleString()} RWF
                  </p>
                  <span className="text-xs text-neutral-400 font-mono">({pendingPayments.length} Pending)</span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Amafaranga ari mu bwishyu buri gutegerezwa kwemezwa na Admin.
                </p>
              </div>

              {/* Card 2: Total Approved Movie Unlocks Count */}
              <div className="p-5 rounded-2xl bg-black/60 border border-emerald-500/50 space-y-2 relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs font-black text-[#00A651] uppercase tracking-wider">
                  <span>Filime Zafunguwe (Approved Unlocks)</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-pulse" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-[#00A651] font-mono">
                    {approvedUnlocksCount} Unlocks
                  </p>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    100% SUCCESS
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Umubare w'inshuro filime/series zafunguriwe abakoresha neza.
                </p>
              </div>

              {/* Card 3: Total Approved Revenue Collected */}
              <div className="p-5 rounded-2xl bg-black/60 border border-purple-500/50 space-y-2 relative overflow-hidden group">
                <div className="flex items-center justify-between text-xs font-black text-purple-400 uppercase tracking-wider">
                  <span>Aya yemejwe Muri Rusange</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-purple-300 font-mono">
                    {approvedRevenueTotal.toLocaleString()} RWF
                  </p>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Akayabo k'amafaranga amaze kwakira mu bwishyu bwbemejwe.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold">Ama Film</p>
              <p className="text-2xl font-black text-white">{stats.moviesCount}</p>
            </div>
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold">Series</p>
              <p className="text-2xl font-black text-white">{stats.seriesCount}</p>
            </div>
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold">Amatangazo</p>
              <p className="text-2xl font-black text-yellow-400">{stats.adsCount}</p>
            </div>
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold">Ibyiciro</p>
              <p className="text-2xl font-black text-purple-400">{stats.categoriesCount}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('users');
                loadUsersData();
              }}
              className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 transition cursor-pointer text-left space-y-1 group"
            >
              <p className="text-xs text-neutral-400 font-bold group-hover:text-emerald-300">Abakoresha (Users)</p>
              <p className="text-2xl font-black text-emerald-400">{users.length}</p>
            </button>
          </div>

          {/* REAL-TIME ONLINE VISITORS & LIVE ANALYTICS PANEL */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-emerald-500/40 space-y-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#00A651]/20 text-[#00A651] border border-[#00A651]/40 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>LIVE VISITORS & ONLINE USERS (ABAKORESHA BAGEZE KURI WEBU)</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-ping" />
                  </h3>
                  <p className="text-xs text-neutral-400">Abantu bari kuri website mu buryo bw'ako kanya (Real-Time Active Sessions).</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/60 border border-emerald-500/40 text-[#00A651] font-mono font-black text-sm shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-pulse" />
                <span>🟢 {visitorStats.onlineCount} Online Right Now</span>
              </div>
            </div>

            {/* Quick Visitor Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                <p className="text-[10px] text-neutral-400 font-bold uppercase">Abasuye website uyu munsi</p>
                <p className="text-xl font-black text-amber-400">{visitorStats.todayVisitorsCount} visitors</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                <p className="text-[10px] text-neutral-400 font-bold uppercase">Abo kuri Mobile Phone</p>
                <p className="text-xl font-black text-emerald-400">{visitorStats.mobilePercentage}% Mobile</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                <p className="text-[10px] text-neutral-400 font-bold uppercase">Aho baturuka cyane</p>
                <p className="text-xl font-black text-purple-400">{visitorStats.topLocation}</p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-0.5">
                <p className="text-[10px] text-neutral-400 font-bold uppercase">Status y'Amaseriveri</p>
                <p className="text-xl font-black text-[#00A651]">ONLINE 100%</p>
              </div>
            </div>

            {/* Active Visitors Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-neutral-300 uppercase tracking-wider">
                👥 ABAKORESHA BARI KURI WEBSITE HANO N'AHO BAGEZE:
              </h4>

              <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-900 text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
                    <tr>
                      <th className="p-3">Umukoresha</th>
                      <th className="p-3">Aho Aherereye</th>
                      <th className="p-3">Igikoresho</th>
                      <th className="p-3">Page / Video ari Kureba</th>
                      <th className="p-3">Ubwiza (Quality)</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80 font-mono">
                    {visitorStats.visitors.length > 0 ? (
                      visitorStats.visitors.map((v) => (
                        <tr key={v.id} className="hover:bg-neutral-900/60 transition">
                          <td className="p-3 font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#00A651] animate-ping" />
                            <span>{v.name}</span>
                          </td>
                          <td className="p-3 text-amber-300 font-bold">{v.location}</td>
                          <td className="p-3 text-neutral-400">{v.device}</td>
                          <td className="p-3 text-emerald-300 font-bold max-w-xs truncate">
                            {v.contentTitle ? `🎥 ${v.contentTitle}` : `📄 Page: ${v.page.toUpperCase()}`}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                              {v.quality || '720p (HD)'}
                            </span>
                          </td>
                          <td className="p-3 text-right text-emerald-400 font-bold">
                            ONLINE NOW
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs text-neutral-400 font-mono italic">
                          ⚡ Nta mukoresha ari kuri website muri aka kanya. Abakoresha bageze kuri webu mu buryo bw'abyo ni bo bonyine bahita bagaragara hano mu buryo bw'ako kanya (Real-time).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pending Payments Approval List */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00A651] animate-ping" />
                <span>Ubwishyu Buri Gutegerezwa (Pending Payments: {pendingPayments.length})</span>
              </h3>
            </div>

            {pendingPayments.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-4 text-center">
                Nta bwishyu buri gutegerezwa muri aka kanya. (No pending payments)
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950 text-neutral-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Telefoni</th>
                      <th className="p-3">Umubare</th>
                      <th className="p-3">Filime ID</th>
                      <th className="p-3">Ubutumwa bwa Umukiriya</th>
                      <th className="p-3">Igihe</th>
                      <th className="p-3 text-right">Igikorwa (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {pendingPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-black/40">
                        <td className="p-3 font-mono font-bold text-white">{p.phone}</td>
                        <td className="p-3 font-mono text-amber-400 font-bold">{p.amount} RWF</td>
                        <td className="p-3 font-mono">{p.movieId || 'impumyi-part1'}</td>
                        <td className="p-3 font-mono text-emerald-300 font-bold max-w-xs truncate">
                          {p.smsMessage ? (
                            <span className="p-1.5 rounded bg-black/60 border border-emerald-500/40 block truncate">
                              💬 {p.smsMessage}
                            </span>
                          ) : (
                            <span className="text-neutral-500 italic">Nta SMS yoherejwe</span>
                          )}
                        </td>
                        <td className="p-3 text-neutral-400 font-mono">{p.timestamp || 'Muri aka kanya'}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => handleApprovePayment(p.id, p.movieId)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs cursor-pointer min-h-[36px]"
                          >
                            ✅ Emeza (Approve 24H)
                          </button>
                          <button
                            onClick={() => handleRejectPayment(p.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer min-h-[36px]"
                          >
                            ❌ Wange
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: UBUTUMWA B'UBWISHYU & RECEIPT CODES */}
      {activeTab === 'payments' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-neutral-900 border border-emerald-500/40 shadow-2xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00A651] animate-ping" />
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  📩 UBUTUMWA B'UBWISHYU N'AMASUPITSI (PAYMENT MESSAGES & RECEIPTS)
                </h2>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Aha niho usanga ubutumwa bwose bw'ubwishyu, nimero za telefone n'amacode (TxID/SMS) abakoresha bohereje.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-black">
                ⏳ {pendingPayments.length} Pending
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-black">
                ✅ {approvedUnlocksCount} Approved
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-4">
            {pendingPayments.length === 0 ? (
              <div className="py-16 text-center space-y-3 font-sans">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-[#00A651] flex items-center justify-center mx-auto text-2xl font-black border border-emerald-500/20">
                  ✓
                </div>
                <p className="text-sm font-bold text-neutral-300">
                  Nta bwishyu buri gutegerezwa muri aka kanya.
                </p>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Iyo umukiriya akoresheje MoMo cyangwa Airtel agashyiramo nimero na code y'ubwishyu, ubutumwa buhita buzama hano buri kugaragara muri aka kanya.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-5 rounded-2xl bg-black/80 border-2 border-emerald-500/40 space-y-3 relative overflow-hidden group hover:border-[#00A651] transition shadow-2xl"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                      <div>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Nimero y'Umukoresha</p>
                        <p className="text-base font-black font-mono text-white">{p.phone || '078XXXXXXX'}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-[#00A651]/20 text-[#00A651] border border-[#00A651]/30 font-mono font-black text-xs">
                        {p.amount || 500} RWF
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">🔑 CODE / UBU TUMWA BWA SMS WAHAWE:</p>
                      <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono text-emerald-300 break-words leading-relaxed select-all">
                        {p.smsMessage || p.txId || p.code || 'Nta code yatanzwe, reba ubutumwa bwa MoMo'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-1">
                      <span>Filime/Plan: {p.movieId || 'VIP 24H'}</span>
                      <span>{p.timestamp || 'Muri aka kanya'}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                      <button
                        onClick={() => handleApprovePayment(p.id, p.movieId, p.amount || 500)}
                        className="flex-1 py-2.5 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer min-h-[40px] flex items-center justify-center gap-1"
                      >
                        ✅ EMEZA UBWISHYU
                      </button>
                      <button
                        onClick={() => handleRejectPayment(p.id)}
                        className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition active:scale-95 cursor-pointer min-h-[40px]"
                      >
                        🗑️ HAKANA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AMA FILM */}
      {activeTab === 'movies' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Ama Film ({movies.length})</h2>
            <button
              onClick={openNewMovieModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-600/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ongeramo film</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950 text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-800">
                <tr>
                  <th className="p-4">Ifoto</th>
                  <th className="p-4">UMUTWE WA FILM</th>
                  <th className="p-4">UBWOKO BWA FILM</th>
                  <th className="p-4">Aho Ibarizwa</th>
                  <th className="p-4">UMWAKA</th>
                  <th className="p-4 text-right">Ibikorwa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {movies.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-800/50 transition">
                    <td className="p-4">
                      <img src={m.posterUrl} alt={m.title} className="w-10 aspect-[2/3] object-cover rounded-lg bg-neutral-950" />
                    </td>
                    <td className="p-4 font-bold text-white max-w-xs truncate">{m.title}</td>
                    <td className="p-4">{m.genre || m.category}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded bg-neutral-800 text-yellow-400 font-mono font-bold">
                        {(m.servers || []).length || 1} Server(s)
                      </span>
                    </td>
                    <td className="p-4 font-mono">{m.year || 2026}</td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openEditMovieModal(m)} className="p-2 rounded bg-neutral-800 text-neutral-300 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteMovie(m.id)} className="p-2 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SERIES */}
      {activeTab === 'series' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">Series ({seriesList.length})</h2>
            <button
              onClick={openNewSeriesModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs shadow-lg transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ongeramo Series</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seriesList.map((s) => (
              <div key={s.id} className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
                <div className="flex items-start gap-4">
                  <img src={s.posterUrl} alt={s.title} className="w-20 aspect-[2/3] object-cover rounded-xl shrink-0 bg-neutral-950" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-base text-white truncate">{s.title}</h3>
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{s.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-yellow-400 font-mono">
                      <span>{s.seasonsCount || 1} Seasons</span>
                      <span>•</span>
                      <span>{(s.episodes || []).length} Episodes</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                  <button
                    onClick={() => openAddEpisodeModal(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeraho Igice</span>
                  </button>
                  <button onClick={() => handleDeleteSeries(s.id)} className="p-2 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: AHO VIDEO IBARIZWA (SERVERS) */}
      {activeTab === 'servers' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black text-white">AHO VIDEO IBARIZWA (SERVERS)</h2>
            <p className="text-xs text-neutral-400">Gucunga no kugenzura no kureba ibipimo by'imashini z'amafilm.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Aho Mbere (Primary Engine)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">ONLINE</span>
              </div>
              <p className="text-xs text-neutral-300">YouTube, Direct MP4, HLS/M3U8, na Bunny Stream Video Engine.</p>
            </div>

            <div className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-yellow-400" />
                  Aho Kabiri (Backup Engine)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">ONLINE</span>
              </div>
              <p className="text-xs text-neutral-300">Aho kabiri h'ubutabazi mu gihe aha mbere hafite ikibazo.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AMATANGAZO (ADS & MONETIZATION SYSTEM) */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span>MONETIZATION & AD SYSTEM (AMATANGAZO)</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Gucunga amatangazo, umubare w'abayarebye, n'injiza ku bakoresha badafite VIP (Ad-Free).
              </p>
            </div>

            <button
              onClick={openNewAdModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs shadow-lg transition active:scale-95 cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>ONGERAHO ITANGAZO GISHYA</span>
            </button>
          </div>

          {/* 1. AD REVENUE TRACKING METRICS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold uppercase">Abarebye Amatangazo (Total Views)</p>
              <p className="text-2xl font-black text-amber-400">{adStats.totalViews}</p>
              <p className="text-[10px] text-neutral-500 font-mono">Today: {adStats.todayViews} views</p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/30 space-y-1">
              <p className="text-xs text-neutral-400 font-bold uppercase">Injiza Izindi (Estimated Revenue)</p>
              <p className="text-2xl font-black text-emerald-400">${adStats.estimatedRevenueUsd}</p>
              <p className="text-[10px] text-emerald-300 font-mono">$0.01 per view calculation</p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold uppercase">Abafite VIP (Ad-Free Premium)</p>
              <p className="text-2xl font-black text-white">{adStats.premiumUsersCount}</p>
              <p className="text-[10px] text-emerald-400 font-bold">100% Zero Ads Experience</p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold uppercase">Abakoresha Badafite VIP (Free)</p>
              <p className="text-2xl font-black text-yellow-400">{adStats.freeUsersCount}</p>
              <p className="text-[10px] text-neutral-400 font-mono">Seeing Pre-roll/Mid-roll/Banners</p>
            </div>
          </div>

          {/* 2. GLOBAL AD FORMAT TOGGLES & FREQUENCY CONTROLS */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              ⚙️ IGENAMITERERE RY'AMATANGAZO (GLOBAL AD CONTROLS)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-bold">
              {/* Pre-roll Toggle */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                <span>Pre-roll Ad (Mbere ya Video)</span>
                <input
                  type="checkbox"
                  checked={adSettings.prerollEnabled}
                  onChange={(e) => handleToggleAdSetting('prerollEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#00A651]"
                />
              </label>

              {/* Mid-roll Toggle */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                <span>Mid-roll Ad (Hagati ya Video)</span>
                <input
                  type="checkbox"
                  checked={adSettings.midrollEnabled}
                  onChange={(e) => handleToggleAdSetting('midrollEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#00A651]"
                />
              </label>

              {/* Banner Ads Toggle */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                <span>Banner Ads (Mu Bice bya Website)</span>
                <input
                  type="checkbox"
                  checked={adSettings.bannerEnabled}
                  onChange={(e) => handleToggleAdSetting('bannerEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#00A651]"
                />
              </label>

              {/* Popup Ad Toggle */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                <span>Popup Interstitial Ad (Mbere yo Kureba)</span>
                <input
                  type="checkbox"
                  checked={adSettings.popupEnabled}
                  onChange={(e) => handleToggleAdSetting('popupEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#00A651]"
                />
              </label>

              {/* Watermark Toggle */}
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 cursor-pointer">
                <span>Watermark Overlay (Kuri Video Player)</span>
                <input
                  type="checkbox"
                  checked={adSettings.watermarkEnabled}
                  onChange={(e) => handleToggleAdSetting('watermarkEnabled', e.target.checked)}
                  className="w-4 h-4 accent-[#00A651]"
                />
              </label>

              {/* Mid-Roll Frequency Selector */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800">
                <span>Mid-roll Frequency:</span>
                <select
                  value={adSettings.midrollIntervalMinutes || 10}
                  onChange={(e) => handleToggleAdSetting('midrollIntervalMinutes', Number(e.target.value))}
                  className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-emerald-400 font-mono font-bold"
                >
                  <option value={5}>Buri minota 5</option>
                  <option value={10}>Buri minota 10</option>
                  <option value={15}>Buri minota 15</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. ACTIVE ADS LIST GRID */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              📋 URUTONDE RWAYI AMATANGAZO ({adsList.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adsList.map((ad) => (
                <div key={ad.id} className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase border border-amber-500/30">
                      {ad.type} {ad.position ? `(${ad.position})` : ''}
                    </span>
                    <button
                      onClick={() => handleToggleAdActive(ad.id)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-black cursor-pointer ${
                        ad.enabled ? 'bg-[#00A651] text-white shadow' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {ad.enabled ? 'ACTIVE ✓' : 'DISABLED ✕'}
                    </button>
                  </div>

                  <div className="relative aspect-video rounded-xl bg-neutral-950 overflow-hidden border border-neutral-800 flex items-center justify-center">
                    {ad.mediaUrl.startsWith('http') ? (
                      <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-3 text-center text-xs font-mono font-bold text-emerald-400">
                        {ad.mediaUrl}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-black text-sm text-white truncate">{ad.title}</h4>
                    <p className="text-[10px] text-neutral-400 font-mono truncate">Target: {ad.targetUrl || 'Nta link'}</p>
                    <p className="text-[10px] text-emerald-400 font-mono font-bold mt-1">
                      👁️ Abayarebye: {ad.impressions || 0} views
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <button
                      onClick={() => openEditAdModal(ad)}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs cursor-pointer"
                    >
                      VUGURURA (EDIT)
                    </button>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: IBYICIRO */}
      {activeTab === 'categories' && (
        <div className="space-y-6 max-w-2xl">
          <h2 className="text-xl font-black text-white">IBYICIRO (CATEGORIES)</h2>

          <form onSubmit={handleSaveCategory} className="p-5 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-3">
            <h3 className="text-xs font-bold text-neutral-400 uppercase">Ongeraho Icyiciro Gishya</h3>
            <input
              type="text"
              required
              placeholder="Izina ry'icyiciro (e.g. Agasobanuye Action)"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-semibold text-white"
            />
            <input
              type="text"
              placeholder="Ibisobanuro"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-semibold text-white"
            />
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs">
              BIKA
            </button>
          </form>

          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs">
                <div>
                  <p className="font-bold text-white">{c.name}</p>
                  <p className="text-neutral-400 text-[10px]">{c.description || c.slug}</p>
                </div>
                <button onClick={() => handleDeleteCategory(c.id)} className="p-2 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: ABANDITSI B'AGASOBANUYE (TRANSLATORS) */}
      {activeTab === 'translators' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Mic className="w-6 h-6 text-[#00A651]" />
                <span>ABANDITSI B'AGASOBANUYE (TRANSLATORS & VOICE ARTISTS)</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Gucunga abanditsi b'agasobanuye (Rocky Kimomo, Junior Giti, Yaba, Sankara, Kazungu, etc.) n'amafilime basobanuye.
              </p>
            </div>
          </div>

          {/* Form to Add New Translator */}
          <form onSubmit={handleAddTranslator} className="p-6 rounded-3xl bg-neutral-900 border border-emerald-500/40 space-y-3">
            <h3 className="text-xs font-black text-[#00A651] uppercase tracking-wider">
              ➕ ONGERAMO UMANDITSI MUSHYA (ADD TRANSLATOR)
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                required
                placeholder="Izina ry'Umwanditsi (e.g. Rocky Kimomo, Junior Giti)..."
                value={newTranslatorName}
                onChange={(e) => setNewTranslatorName(e.target.value)}
                className="flex-1 w-full px-4 py-3 rounded-2xl bg-black border border-neutral-800 text-white font-bold text-xs outline-none focus:border-[#00A651]"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer min-h-[44px]"
              >
                ➕ Ongeramo Umwanditsi
              </button>
            </div>
          </form>

          {/* Translators List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {translators.map((name) => {
              const movieCount = movies.filter((m) =>
                (m.description || '').toLowerCase().includes(name.toLowerCase()) ||
                (m.title || '').toLowerCase().includes(name.toLowerCase()) ||
                (m.genre || '').toLowerCase().includes(name.toLowerCase())
              ).length;

              return (
                <div key={name} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#00A651]/20 border border-[#00A651]/40 text-[#00A651] flex items-center justify-center font-black text-lg">
                      🎙️
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white">{name}</h4>
                      <p className="text-xs text-amber-400 font-bold">{movieCount} Filime Basobanuye</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTranslator(name)}
                    className="p-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Siba Umwanditsi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Users className="w-6 h-6 text-[#00A651]" />
                <span>ABAKORESHA N'UBWISHYU (USER MANAGEMENT)</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Imbonerahamwe y'abakoresha bose, abishyuye (VIP 24H), n'abari kureba mu buryo bw'ako kanya.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer min-h-[40px] flex items-center gap-1.5"
              >
                ➕ ONGERAMO UMUKORESHA MUSHYA
              </button>
              <button
                onClick={loadUsersData}
                className="px-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer min-h-[40px]"
              >
                🔄 Refresh List
              </button>
            </div>
          </div>

          {/* User Metrics Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold uppercase">Abakoresha Bose</p>
              <p className="text-2xl font-black text-white">{users.length}</p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/40 space-y-1">
              <p className="text-xs text-neutral-400 font-bold uppercase">Bari Kuri Site (Online)</p>
              <p className="text-2xl font-black text-[#00A651]">🟢 {visitorStats?.onlineCount || 1}</p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-amber-500/40 space-y-1">
              <p className="text-xs text-neutral-400 font-bold uppercase">Abishyuye (VIP 24H Active)</p>
              <p className="text-2xl font-black text-amber-400">
                ⭐ {users.filter((u) => u && (u.isVip || u.role === 'admin')).length}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-1">
              <p className="text-xs text-neutral-400 font-bold uppercase">Abadashyuye (Free)</p>
              <p className="text-2xl font-black text-neutral-400">
                🆓 {users.filter((u) => u && !u.isVip && u.role !== 'admin').length}
              </p>
            </div>
          </div>

          {/* Registered Users Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              📋 IMbonerahamwe y'Abakoresha Wandikishije ({users.length})
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-900">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950 text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
                  <tr>
                    <th className="p-4">Izina</th>
                    <th className="p-4">Imeri / Telefone</th>
                    <th className="p-4">Status y'Ubwishyu</th>
                    <th className="p-4">Inshingano (Role)</th>
                    <th className="p-4 text-right">Ibikorwa (Admin Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono">
                  {users.map((u) => {
                    if (!u) return null;
                    const userRole = u.role || 'user';
                    const isVipUser = !!u.isVip || userRole === 'admin';
                    const userName = u.name || 'Umukoresha';
                    const contact = u.emailOrPhone || u.id || 'Nta Nimero';

                    return (
                      <tr key={u.id || Math.random()} className="hover:bg-neutral-800/50 transition">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isVipUser ? 'bg-amber-400' : 'bg-neutral-500'}`} />
                          <span>{userName}</span>
                        </td>
                        <td className="p-4 text-neutral-300">{contact}</td>
                        <td className="p-4">
                          {isVipUser ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                              ⭐ VIP (24H UNLOCKED)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-bold">
                              🆓 FREE MEMBER
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${userRole === 'admin' ? 'bg-[#00A651] text-white' : 'bg-neutral-800 text-neutral-300'}`}>
                            {userRole.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleToggleUserVip(u.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer min-h-[36px] ${
                              isVipUser
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black'
                                : 'bg-[#00A651] hover:bg-[#008f45] text-white'
                            }`}
                          >
                            {isVipUser ? '🔒 Funga VIP' : '⭐ Fungura VIP (24H)'}
                          </button>

                          <button
                            onClick={() => toggleUserRole(u.id, userRole as any)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs cursor-pointer min-h-[36px]"
                          >
                            🛡️ Role
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 font-bold text-xs cursor-pointer min-h-[36px]"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: EMAILS & NOTIFICATIONS */}
      {activeTab === 'emails' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Mail className="w-6 h-6 text-[#00A651]" />
                <span>EMAIL NOTIFICATIONS & AUTOMATION CENTER</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Aha niho ubona za notification emails zoherejwe neza ku abakoresha (Welcome Emails, VIP Approved Emails, Custom Notifications).
              </p>
            </div>

            <button
              onClick={reloadEmailLogs}
              className="px-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer min-h-[40px]"
            >
              🔄 Refresh Email Logs
            </button>
          </div>

          {/* SEND CUSTOM EMAIL NOTIFICATION FORM */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-emerald-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-emerald-400 uppercase tracking-wider">
              <Mail className="w-5 h-5 text-[#00A651]" />
              <span>YOHEREZA NOTIFICATION EMAIL KURI EMAIL Y'UMUKORESHA</span>
            </div>

            <form onSubmit={handleSendCustomEmail} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-neutral-300 uppercase mb-1">
                    EMAIL Y'UMUKORESHA (RECIPIENT EMAIL) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="urugero: user@gmail.com"
                    value={customEmailTo}
                    onChange={(e) => setCustomEmailTo(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono outline-none focus:border-[#00A651]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-neutral-300 uppercase mb-1">
                    IZINA RYA UMUKORESHA (RECIPIENT NAME)
                  </label>
                  <input
                    type="text"
                    placeholder="urugero: Jean-Paul"
                    value={customEmailName}
                    onChange={(e) => setCustomEmailName(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono outline-none focus:border-[#00A651]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-neutral-300 uppercase mb-1">
                  UMUTWE W'UBUTUMWA (EMAIL SUBJECT) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="urugero: 🎉 Murakaza neza kuri MK HERO MOVIES!"
                  value={customEmailSubject}
                  onChange={(e) => setCustomEmailSubject(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono outline-none focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-neutral-300 uppercase mb-1">
                  UBUTUMWA (EMAIL BODY TEXT) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Andika ubutumwa bwa notification hano..."
                  value={customEmailBody}
                  onChange={(e) => setCustomEmailBody(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono outline-none focus:border-[#00A651]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-[#00A651] hover:bg-[#008f45] text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer min-h-[48px]"
              >
                📤 YOHEREZA EMAIL NOTIFICATION MURI AKA KANYA
              </button>
            </form>
          </div>

          {/* EMAIL LOGS TABLE */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>📋 URUTONDE RWA ZA NOTIFICATIONS ZOHEREJWE ({emailLogs.length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-black">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-900 text-neutral-400 font-mono uppercase text-[10px] border-b border-neutral-800">
                  <tr>
                    <th className="p-3">Email Y'Umukoresha</th>
                    <th className="p-3">Ubwoko</th>
                    <th className="p-3">Umutwe W'Ubutumwa</th>
                    <th className="p-3">Igihe</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80 font-mono">
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-900/60 transition">
                      <td className="p-3 font-bold text-white">
                        <div>{log.recipientName}</div>
                        <div className="text-[10px] text-emerald-400">{log.recipientEmail}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                          {log.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate text-amber-300 font-bold">{log.subject}</td>
                      <td className="p-3 text-neutral-400 text-[11px]">{log.timestamp}</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          ✅ {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: IGENAMITERERE */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-xl p-6 rounded-3xl bg-neutral-900 border border-neutral-800">
          <h2 className="text-xl font-black text-white">IGENAMITERERE</h2>
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-neutral-400 font-bold mb-1">Izina rya Platform</label>
              <input type="text" readOnly value="MK HERO MOVIES" className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-bold" />
            </div>
            <div>
              <label className="block text-neutral-400 font-bold mb-1">Ururimi rw'Ibanze</label>
              <input type="text" readOnly value="Kinyarwanda" className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-yellow-400 font-bold" />
            </div>
          </div>
        </div>
      )}

      {/* MOVIE EDIT / ADD MODAL */}
      {showMovieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-white">
              {editingMovie ? 'HINDURA AMAKURU YA FILM' : 'Ongeramo film shya'}
            </h3>

            <form onSubmit={handleSaveMovie} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-black mb-1">UMUTWE WA FILM</label>
                  <input
                    type="text"
                    required
                    value={mTitle}
                    onChange={(e) => setMTitle(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-black mb-1">UBWOKO BWA FILM</label>
                  <select
                    value={mGenre}
                    onChange={(e) => setMGenre(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-bold"
                  >
                    <option value="Agasobanuye Action">Agasobanuye Action</option>
                    <option value="Agasobanuye Drama">Agasobanuye Drama</option>
                    <option value="Rwandan Local Films">Rwandan Local Films</option>
                    <option value="Comedy">Comedy</option>
                    <option value="Romance">Romance</option>
                    <option value="Documentary">Documentary</option>
                  </select>
                </div>
              </div>

              {/* POSTER & BACKDROP FIELDS WITH VALIDATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-neutral-300 font-black">IFOTO YA FILM</label>
                  <input
                    type="text"
                    required
                    placeholder="https://..."
                    value={mPosterUrl}
                    onChange={(e) => {
                      setMPosterUrl(e.target.value);
                      setPosterImageError(false);
                    }}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                  <p className="text-[10px] text-neutral-400">Shyiramo URL y'ifoto ya film, ntabwo ari URL ya YouTube.</p>

                  {/* Detect YouTube URL entered into poster field */}
                  {isYouTubeUrl(mPosterUrl) && (
                    <div className="p-2 rounded-xl bg-yellow-950/80 border border-yellow-500/50 text-yellow-400 font-bold text-[11px] flex items-center justify-between gap-2 mt-1">
                      <span>⚠️ Iyi ni URL ya video, si URL y'ifoto.</span>
                      <button
                        type="button"
                        onClick={handleAutoExtractYouTubeThumbnail}
                        className="px-2 py-1 rounded bg-yellow-500 text-black font-black text-[10px]"
                      >
                        KORESHE PREVIEW
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-neutral-300 font-black">IFOTO NINI YA FILM</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={mBackdropUrl}
                    onChange={(e) => setMBackdropUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                  <p className="text-[10px] text-neutral-400">Shyiramo URL y'ifoto nini izagaragara kuri page ya film.</p>
                </div>
              </div>

              {/* POSTER PREVIEW & SHAKA IFOTO YA YOUTUBE BUTTON */}
              <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 aspect-[2/3] rounded-lg bg-neutral-900 overflow-hidden border border-neutral-800 shrink-0 relative flex items-center justify-center">
                    {mPosterUrl && !posterImageError && !isYouTubeUrl(mPosterUrl) ? (
                      <img
                        src={mPosterUrl}
                        alt="Preview"
                        onError={() => setPosterImageError(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-neutral-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">Preview y'ifoto</p>
                    {posterImageError ? (
                      <p className="text-[10px] font-bold text-red-400">IFOTO NTIBONETSE. REBA URL WASHYIZEMO.</p>
                    ) : mPosterUrl && !isYouTubeUrl(mPosterUrl) ? (
                      <p className="text-[10px] font-bold text-emerald-400">Ifoto iragufunguka neza ✓</p>
                    ) : (
                      <p className="text-[10px] text-neutral-400">Ifoto iragaragara hano mbere yo kubika</p>
                    )}
                  </div>
                </div>

                {/* SHAKA IFOTO YA YOUTUBE Button */}
                <button
                  type="button"
                  onClick={handleAutoExtractYouTubeThumbnail}
                  className="px-3.5 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>SHAKA IFOTO YA YOUTUBE</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-300 font-black mb-1">UMWAKA</label>
                  <input
                    type="number"
                    value={mYear}
                    onChange={(e) => setMYear(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-neutral-300 font-black mb-1">IGIHE FILM IMARA (DURATION)</label>
                  <input
                    type="text"
                    value={mDuration}
                    onChange={(e) => setMDuration(e.target.value)}
                    placeholder="e.g. 2h 15m, 1h 45m, 3h 00m"
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['1h 30m', '1h 45m', '2h 00m', '2h 15m', '2h 30m', '3h 00m', '3h 15m'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setMDuration(preset)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black border transition cursor-pointer ${
                          mDuration === preset
                            ? 'bg-[#00A651] text-white border-[#00A651]'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        ⏱️ {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-300 font-black mb-1">URURIMI</label>
                  <input
                    type="text"
                    value={mLanguage}
                    onChange={(e) => setMLanguage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-black mb-1">IBISOBANURO BYA FILM</label>
                <textarea
                  rows={2}
                  value={mDescription}
                  onChange={(e) => setMDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"
                />
              </div>

              {/* DYNAMIC VIDEO SERVERS (AHO VIDEO IBARIZWA) */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-400 font-black uppercase">
                    <Server className="w-4 h-4" />
                    <span>AHO VIDEO IBARIZWA (VIDEO SERVERS)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddServerField}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ongeraho Aho Video Ibarizwa</span>
                  </button>
                </div>

                {mServers.map((srv, idx) => (
                  <div key={srv.id || idx} className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-400 font-bold mb-0.5">Izina ry'aho ibarizwa</label>
                        <input
                          type="text"
                          value={srv.serverName}
                          onChange={(e) => handleUpdateServerField(idx, 'serverName', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-bold text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 font-bold mb-0.5">Ubwoko bwa Video</label>
                        <select
                          value={srv.type || 'youtube'}
                          onChange={(e) => handleUpdateServerField(idx, 'type', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-bold text-xs"
                        >
                          <option value="youtube">YouTube Video</option>
                          <option value="mp4">Direct MP4 URL</option>
                          <option value="hls">HLS / M3U8 Stream</option>
                          <option value="bunny">Bunny Stream / ID</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-400 font-bold mb-0.5">UBWIZA BWA VIDEO</label>
                        <select
                          value={srv.quality}
                          onChange={(e) => handleUpdateServerField(idx, 'quality', e.target.value)}
                          className="w-full p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-bold text-xs"
                        >
                          <option value="360p">360p</option>
                          <option value="480p">480p</option>
                          <option value="720p">720p</option>
                          <option value="1080p">1080p</option>
                          <option value="BYIKORA">BYIKORA (AUTO)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold mb-0.5">
                        {srv.type === 'youtube'
                          ? 'YouTube URL (e.g. https://youtu.be/VIDEO_ID)'
                          : srv.type === 'bunny'
                          ? 'Bunny Video ID / Embed Link'
                          : srv.type === 'hls'
                          ? 'M3U8 Stream URL'
                          : 'Direct MP4 Video URL'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={
                          srv.type === 'youtube'
                            ? 'https://youtu.be/...'
                            : srv.type === 'bunny'
                            ? 'Bunny Embed URL or Video ID'
                            : 'https://...'
                        }
                        value={srv.serverUrl}
                        onChange={(e) => handleUpdateServerField(idx, 'serverUrl', e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-300">
                        <input
                          type="checkbox"
                          checked={srv.downloadEnabled}
                          onChange={(e) => handleUpdateServerField(idx, 'downloadEnabled', e.target.checked)}
                          className="rounded accent-red-600"
                        />
                        <span>Emeza gukuramo video</span>
                      </label>

                      {srv.downloadEnabled && (
                        <input
                          type="text"
                          placeholder="URL yemewe yo gukuramo video"
                          value={srv.downloadUrl || ''}
                          onChange={(e) => handleUpdateServerField(idx, 'downloadUrl', e.target.value)}
                          className="flex-1 p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-[11px]"
                        />
                      )}

                      {mServers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveServerField(idx)}
                          className="p-1.5 rounded bg-red-600/20 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovieModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-neutral-800 text-white font-extrabold"
                >
                  REKA
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 font-extrabold text-white shadow-lg"
                >
                  BIKA FILM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AD EDIT / ADD MODAL (MATCHING MOVIE MODAL DESIGN FROM SCREENSHOT) */}
      {showAdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto font-sans">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white space-y-4 my-8 shadow-2xl">
            <h3 className="text-xl font-black text-white">
              {editingAd ? 'Hindura itangazo' : 'Ongeramo itangazo shya'}
            </h3>

            <form onSubmit={handleSaveAd} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-neutral-300 uppercase mb-1">
                    UMUTWE WA ITANGAZO
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MTN MoMo 4G Special Offer"
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-bold outline-none focus:border-[#00A651]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-300 uppercase mb-1">
                    UBWOKO BWA ITANGAZO
                  </label>
                  <select
                    value={adType}
                    onChange={(e) => setAdType(e.target.value as any)}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-bold outline-none focus:border-[#00A651]"
                  >
                    <option value="preroll">Pre-roll (Mbere ya Video)</option>
                    <option value="midroll">Mid-roll (Hagati ya Video)</option>
                    <option value="banner">Banner (Kuri Website)</option>
                    <option value="popup">Popup Interstitial</option>
                    <option value="watermark">Watermark Overlay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-neutral-300 uppercase mb-1">
                  AHO RUJYA (POSITION SLOT)
                </label>
                <select
                  value={adPosition}
                  onChange={(e) => setAdPosition(e.target.value as any)}
                  className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-bold outline-none focus:border-[#00A651]"
                >
                  <option value="header">Mbere ya Header</option>
                  <option value="player_top">Mbere ya Player</option>
                  <option value="player_bottom">Nyuma ya Player</option>
                  <option value="above_related">Mbere ya Related Movies</option>
                  <option value="footer">Kuri Footer</option>
                  <option value="popup">Popup Overlay</option>
                  <option value="watermark">Watermark Player Corner</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-neutral-300 uppercase mb-1">
                    IFOTO YA ITANGAZO (THUMBNAIL)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://... cyangwa link ya YouTube"
                    value={adMediaUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      const ytId = extractYouTubeId(val);
                      if (ytId) {
                        setAdMediaUrl(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
                        if (!adVideoUrl) setAdVideoUrl(`https://www.youtube.com/watch?v=${ytId}`);
                      } else {
                        setAdMediaUrl(val);
                      }
                    }}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono outline-none focus:border-[#00A651]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Shyiramo URL y'ifoto cyangwa link ya YouTube (izakora auto-convert).
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-300 uppercase mb-1">
                    IFOTO NINI YA ITANGAZO (BACKDROP/BANNER)
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={adMediaUrl}
                    onChange={(e) => setAdMediaUrl(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono outline-none focus:border-[#00A651]"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Shyiramo URL y'ifoto nini izagaragara kuri page ya ad.
                  </p>
                </div>
              </div>

              {/* PREVIEW Y'IFOTO & YELLOW YOUTUBE THUMBNAIL BUTTON (MATCHING SCREENSHOT) */}
              <div className="p-3.5 rounded-2xl bg-black border border-neutral-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                    {adMediaUrl && adMediaUrl.startsWith('http') ? (
                      <img
                        src={adMediaUrl}
                        alt="Preview"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&q=80';
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-neutral-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-black text-white text-xs">Preview y'ifoto</p>
                    <p className="text-[10px] text-neutral-400">Ifoto iragaragara hano mbere yo kubika</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const source = adVideoUrl || adTargetUrl || adMediaUrl;
                    const ytId = extractYouTubeId(source);
                    if (ytId) {
                      const thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                      setAdMediaUrl(thumb);
                      alert(`✨ YouTube Thumbnail y'iyi video (${ytId}) yakuruwe neza!`);
                    } else {
                      alert('⚠️ Nta link ya YouTube yabonetse. Nyamuneka shyiramo link ya YouTube muri Video URL.');
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#ffcc00] hover:bg-yellow-400 text-black font-black text-xs uppercase tracking-tight transition active:scale-95 shadow-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>SHAKA IFOTO YA YOUTUBE</span>
                </button>
              </div>

              {/* DURATION & PRESET PILLS (MATCHING SCREENSHOT DURATION PILLS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-neutral-300 uppercase mb-1">
                    IGIHE ITANGAZO IMARA (DURATION)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={adDuration}
                    onChange={(e) => setAdDuration(Number(e.target.value))}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono text-xs mb-2 outline-none focus:border-[#00A651]"
                  />
                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 15, 30, 45, 60].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setAdDuration(s)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black transition cursor-pointer ${
                          adDuration === s
                            ? 'bg-[#00A651] text-white border border-emerald-400'
                            : 'bg-neutral-800 text-neutral-300 hover:text-white'
                        }`}
                      >
                        ⏱ {s}s
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-300 uppercase mb-1">
                    IGIHE CYO GUSIMBUTSA (SKIP AFTER)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={adSkipAfter}
                    onChange={(e) => setAdSkipAfter(Number(e.target.value))}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono text-xs mb-2 outline-none focus:border-[#00A651]"
                  />
                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[3, 5, 10, 15].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setAdSkipAfter(s)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black transition cursor-pointer ${
                          adSkipAfter === s
                            ? 'bg-[#00A651] text-white border border-emerald-400'
                            : 'bg-neutral-800 text-neutral-300 hover:text-white'
                        }`}
                      >
                        ⏩ {s}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ASPECT RATIO (16:9 vs 9:16) & AD AUDIO SOUND TOGGLE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-2xl bg-black border border-neutral-800">
                <div>
                  <label className="block text-[11px] font-black text-amber-400 uppercase mb-1.5 flex items-center gap-1.5">
                    📐 UBWOKO BWA ASPECT RATIO
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdAspectRatio('16:9')}
                      className={`p-2.5 rounded-xl font-extrabold text-xs flex flex-col items-center gap-1 border transition cursor-pointer ${
                        adAspectRatio === '16:9'
                          ? 'bg-[#00A651] text-white border-emerald-400 shadow-md'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">📺 16:9</span>
                      <span className="text-[10px] font-mono">Widescreen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdAspectRatio('9:16')}
                      className={`p-2.5 rounded-xl font-extrabold text-xs flex flex-col items-center gap-1 border transition cursor-pointer ${
                        adAspectRatio === '9:16'
                          ? 'bg-[#00A651] text-white border-emerald-400 shadow-md'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                      }`}
                    >
                      <span className="text-sm">📱 9:16</span>
                      <span className="text-[10px] font-mono">Shorts / Reel</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-emerald-400 uppercase mb-1.5 flex items-center gap-1.5">
                    🔊 AMAJWI YA AD (AUDIO SOUND)
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adEnableAudio}
                      onChange={(e) => setAdEnableAudio(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#00A651]"
                    />
                    <div>
                      <span className="block font-bold text-white text-xs">
                        {adEnableAudio ? '🔊 Amajwi arikora (Audio Sound ON)' : '🔇 Amajwi afunze (Muted)'}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Sembura akabuto k'amajwi kuri video ad
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* AHO VIDEO YA AD IBARIZWA (VIDEO SERVERS SECTION MATCHING SCREENSHOT) */}
              <div className="p-4 rounded-2xl bg-black border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-400 font-black uppercase">
                    <Server className="w-4 h-4" />
                    <span>AHO VIDEO YA AD IBARIZWA (AD VIDEO SERVERS)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold mb-0.5">Izina ry'aho ibarizwa</label>
                      <input
                        type="text"
                        value="Aho Mbere 1"
                        readOnly
                        className="w-full p-2 rounded-xl bg-black border border-neutral-800 text-white font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold mb-0.5">Ubwoko bwa Video</label>
                      <select
                        value={isYouTubeUrl(adVideoUrl) ? 'youtube' : 'mp4'}
                        onChange={(e) => {
                          if (e.target.value === 'youtube' && !isYouTubeUrl(adVideoUrl)) {
                            setAdVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                            setAdMediaUrl(getYouTubeThumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
                          }
                        }}
                        className="w-full p-2 rounded-xl bg-black border border-neutral-800 text-white font-bold text-xs"
                      >
                        <option value="youtube">YouTube Video</option>
                        <option value="mp4">Direct MP4 URL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-400 font-bold mb-0.5">UBWIZA BWA VIDEO</label>
                      <select
                        defaultValue="720p"
                        className="w-full p-2 rounded-xl bg-black border border-neutral-800 text-white font-bold text-xs"
                      >
                        <option value="360p">360p</option>
                        <option value="480p">480p</option>
                        <option value="720p">720p (HD)</option>
                        <option value="1080p">1080p (FHD)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-400 font-bold mb-0.5">
                      YouTube URL / MP4 URL (e.g. https://youtu.be/VIDEO_ID)
                    </label>
                    <input
                      type="text"
                      placeholder="https://youtu.be/..."
                      value={adVideoUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdVideoUrl(val);
                        if (isYouTubeUrl(val)) {
                          setAdMediaUrl(getYouTubeThumbnailUrl(val));
                        }
                      }}
                      className="w-full p-2.5 rounded-xl bg-black border border-neutral-800 text-white font-mono text-xs outline-none focus:border-[#00A651]"
                    />
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (MATCHING SCREENSHOT) */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdModal(false)}
                  className="px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-extrabold cursor-pointer transition active:scale-95"
                >
                  REKA
                </button>
                <button
                  type="submit"
                  className="px-7 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 cursor-pointer"
                >
                  BIKA ITANGAZO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ONGERAMO UMUKORESHA MUSHYA */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in font-sans">
          <div className="relative w-full max-w-md rounded-3xl p-6 bg-neutral-900 border-2 border-emerald-500/40 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00A651]" />
                <span>ONGERAMO UMUKORESHA MUSHYA</span>
              </h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-neutral-300 font-bold mb-1">Izina ry'Umukoresha (Full Name)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jean Paul M."
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white outline-none focus:border-[#00A651]"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-bold mb-1">Telefone cyangwa Imeri (07XXXXXXXX / email)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0788123456"
                  value={uEmailOrPhone}
                  onChange={(e) => setUEmailOrPhone(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-mono outline-none focus:border-[#00A651]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-bold mb-1">Inshingano (Role)</label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as any)}
                    className="w-full p-3 rounded-2xl bg-black border border-neutral-800 text-white font-bold outline-none"
                  >
                    <option value="user">User (Umukoresha)</option>
                    <option value="admin">Admin (Ubuyobozi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-bold mb-1">VIP Status</label>
                  <button
                    type="button"
                    onClick={() => setUIsVip(!uIsVip)}
                    className={`w-full p-3 rounded-2xl font-black transition cursor-pointer min-h-[44px] ${
                      uIsVip ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {uIsVip ? '⭐ VIP Active' : '🆓 Free User'}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 text-white font-bold cursor-pointer"
                >
                  REKA
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white font-black uppercase shadow-lg transition active:scale-95 cursor-pointer"
                >
                  BIKA UMUKORESHA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
