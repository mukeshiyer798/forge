import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore, mapBackendUserToUser } from '@/store/useAppStore';
import { getAccessToken, setAccessToken } from '@/lib/auth';
import { getCurrentUser, setupTokenRefresh, clearTokenRefresh } from '@/lib/api';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import GoalsPage from '@/pages/GoalsPage';
import ReadingPage from '@/pages/ReadingPage';
import SettingsPage from '@/pages/SettingsPage';
import ExecutiveDashboard from '@/pages/ExecutiveDashboard';
import Sidebar from '@/components/Sidebar';
import StreakCelebration from '@/components/StreakCelebration';
import ReloadMessage from '@/components/ReloadMessage';
import OnboardingTour from '@/components/OnboardingTour';
import { ToastProvider } from '@/lib/toast';

const PAGE_MAP = {
  dashboard: DashboardPage,
  goals: GoalsPage,
  reading: ReadingPage,
  executive: ExecutiveDashboard,
  settings: SettingsPage,
};

export default function App() {
  const { isAuthenticated, activeView, login, logout } = useAppStore();
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    getCurrentUser()
      .then((user) => {
        login(mapBackendUserToUser(user));
        // Fetch user's goals from backend (RBAC-scoped)
        useAppStore.getState().fetchGoalsFromBackend();
        useAppStore.getState().fetchReadingInsightsFromBackend();
        // Start auto token refresh (every 50 min, token expires in 60)
        setupTokenRefresh((newToken) => setAccessToken(newToken));
      })
      .catch(() => {
        clearTokenRefresh();
        logout();
      })
      .finally(() => {
        setAuthChecking(false);
      });
    return () => clearTokenRefresh();
  }, [login, logout]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center">
        <span className="font-mono text-forge-dim text-sm">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;

  const ActivePage = PAGE_MAP[activeView as keyof typeof PAGE_MAP] ?? DashboardPage;

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-forge-bg">
        <Sidebar />
        <div className="flex-1 min-w-0 lg:pt-0 pt-[57px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-screen"
            >
              <ActivePage />
            </motion.div>
          </AnimatePresence>
        </div>
        <StreakCelebration />
        <ReloadMessage />
        <OnboardingTour />
      </div>
    </ToastProvider>
  );
}
