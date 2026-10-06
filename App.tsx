import React, { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { WhatsAppButton } from './components/WhatsAppButton';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { AuthModal } from './components/AuthModal';
import { PaymentModal } from './components/PaymentModal';
import { WelcomeModal } from './components/WelcomeModal';
import { SubscriptionBanner } from './components/SubscriptionBanner';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RecentlyWatchedSection } from './components/RecentlyWatchedSection';
import { HomePage } from './pages/HomePage';

// Route-based code splitting
const MoviesPage = lazy(() => import('./pages/MoviesPage').then((m) => ({ default: m.MoviesPage })));
const SeriesPage = lazy(() => import('./pages/SeriesPage').then((m) => ({ default: m.SeriesPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const WatchPage = lazy(() => import('./pages/WatchPage').then((m) => ({ default: m.WatchPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));

const PageSkeleton: React.FC = () => (
  <div className="py-8 space-y-6 animate-pulse font-sans">
    <div className="h-10 w-48 bg-neutral-900 rounded-xl" />
    <div className="h-64 w-full bg-neutral-900 rounded-3xl" />
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="h-48 bg-neutral-900 rounded-2xl" />
      <div className="h-48 bg-neutral-900 rounded-2xl" />
      <div className="h-48 bg-neutral-900 rounded-2xl" />
      <div className="h-48 bg-neutral-900 rounded-2xl" />
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { currentPage, setCurrentPage } = useAuth();

  // Check secret URL path on mount
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('admin-secret') || path.includes('admin_secret') || path.endsWith('/admin')) {
      setCurrentPage('admin');
    }
  }, [setCurrentPage]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#080d09] via-[#041208] to-[#080d09] text-white font-sans antialiased selection:bg-[#00A651] selection:text-white flex flex-col relative overflow-x-hidden">
      {/* Background MK HERO MOVIES Watermark Brand Overlay */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12vw] sm:text-[10vw] font-black text-[#00A651]/[0.05] z-0 pointer-events-none whitespace-nowrap tracking-[18px] select-none font-sans uppercase">
        MK HERO MOVIES
      </div>

      <Toast />
      <OfflineIndicator />
      <Navbar />
      <SubscriptionBanner />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 relative z-10">
        <Suspense fallback={<PageSkeleton />}>
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'movies' && <MoviesPage />}
          {currentPage === 'series' && <SeriesPage />}
          {currentPage === 'search' && <SearchPage />}
          {currentPage === 'categories' && <CategoriesPage />}
          {currentPage === 'account' && <AccountPage />}
          {currentPage === 'contact' && <ContactPage />}
          {currentPage === 'watch' && <WatchPage />}
          {currentPage === 'admin' && <AdminPage />}
        </Suspense>
      </main>

      {currentPage !== 'admin' && <RecentlyWatchedSection />}
      <Footer />
      <WhatsAppButton />
      <PWAInstallBanner />
      <BottomNav />
      <AuthModal />
      <PaymentModal />
      <WelcomeModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
