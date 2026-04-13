import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import DashboardPage from '@/pages/DashboardPage';
import GoalsPage from '@/pages/GoalsPage';
import ReadingPage from '@/pages/ReadingPage';
import SettingsPage from '@/pages/SettingsPage';
import ExecutiveDashboard from '@/pages/ExecutiveDashboard';
import AuthPage from '@/pages/AuthPage';
import Sidebar from '@/components/Sidebar';
import StreakCelebration from '@/components/StreakCelebration';
import ReloadMessage from '@/components/ReloadMessage';
import OnboardingTour from '@/components/OnboardingTour';
import PomodoroSession from '@/components/PomodoroSession';
import StreakToastHandler from '@/components/StreakToastHandler';
import { ToastProvider } from '@/lib/toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('App');

const PAGE_MAP = {
  dashboard: DashboardPage,
  goals: GoalsPage,
  reading: ReadingPage,
  executive: ExecutiveDashboard,
  settings: SettingsPage,
};

export default function App() {
  const { activeView, isAuthenticated, goalsLoaded, initializeAuth } = useAppStore();

  useEffect(() => {
    // Check for existing session on mount
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      log.info('navigation.view_changed', { view: activeView });
    }
  }, [activeView, isAuthenticated]);

  // Loading state for initial session recovery
  if (!goalsLoaded && useAppStore.getState().user === null && localStorage.getItem('forge_token')) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center">
        <span className="font-mono text-forge-dim text-sm uppercase tracking-widest animate-pulse">
          Synchronizing Identity...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

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
        <PomodoroSession />
        <StreakToastHandler />
      </div>
    </ToastProvider>
  );
}
