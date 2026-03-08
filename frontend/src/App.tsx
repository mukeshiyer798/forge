import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth, useUser, SignIn, SignUp } from '@clerk/react';
import { useAppStore, mapBackendUserToUser } from '@/store/useAppStore';
import { getCurrentUser, setClerkTokenProvider } from '@/lib/api';
import DashboardPage from '@/pages/DashboardPage';
import GoalsPage from '@/pages/GoalsPage';
import ReadingPage from '@/pages/ReadingPage';
import SettingsPage from '@/pages/SettingsPage';
import ExecutiveDashboard from '@/pages/ExecutiveDashboard';
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
  const { isSignedIn, isLoaded: isAuthLoaded, getToken } = useAuth();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { activeView, login, logout, isAuthenticated } = useAppStore();
  const [provisioning, setProvisioning] = useState(false);

  useEffect(() => {
    setClerkTokenProvider(getToken);
  }, [getToken]);

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) return;

    if (!isSignedIn) {
      logout();
      return;
    }

    // Sync with backend
    setProvisioning(true);
    log.info('identity.sync.started', { clerkId: clerkUser?.id });
    getCurrentUser()
      .then((user) => {
        log.info('identity.sync.success', { userId: user.id });
        login(mapBackendUserToUser(user));
        useAppStore.getState().fetchGoalsFromBackend();
        useAppStore.getState().fetchReadingInsightsFromBackend();
        useAppStore.getState().fetchActivePomodoroFromBackend();
        useAppStore.getState().validateStreak();
      })
      .catch((err) => {
        log.error('identity.sync.failed', { clerkId: clerkUser?.id }, err);
        // If backend fails to find/provision user, logout from Clerk too?
        // For now, just logout from local store
        logout();
      })
      .finally(() => {
        setProvisioning(false);
      });
  }, [isSignedIn, isAuthLoaded, isUserLoaded, login, logout, clerkUser]);

  useEffect(() => {
    if (isSignedIn) {
      log.info('navigation.view_changed', { view: activeView });
    }
  }, [activeView, isSignedIn]);

  if (!isAuthLoaded || !isUserLoaded || provisioning) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center">
        <span className="font-mono text-forge-dim text-sm uppercase tracking-widest animate-pulse">
          Synchronizing Identity...
        </span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center p-4">
        <SignIn appearance={{
          elements: {
            card: "bg-forge-surface border border-forge-border shadow-2xl",
            headerTitle: "text-forge-text font-display tracking-widest uppercase",
            headerSubtitle: "text-forge-dim uppercase tracking-[0.1em] font-mono text-xs",
            socialButtonsBlockButton: "bg-forge-surface2 border-forge-border text-forge-text hover:bg-forge-surface3",
            formFieldLabel: "text-forge-dim uppercase tracking-wider font-condensed text-xs mb-1",
            formFieldInput: "bg-forge-surface2 border-forge-border text-forge-text focus:border-forge-amber",
            formButtonPrimary: "bg-forge-amber hover:bg-forge-amber/90 text-forge-bg font-condensed uppercase tracking-widest",
            footerActionText: "text-forge-dim",
            footerActionLink: "text-forge-amber hover:text-forge-amber/80",
            dividerText: "text-forge-muted uppercase tracking-widest text-[10px]",
            dividerLine: "bg-forge-border"
          }
        }} />
      </div>
    );
  }

  // Fallback if local state hasn't caught up yet
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center">
        <span className="font-mono text-forge-dim text-sm uppercase tracking-widest animate-pulse">
          Finalizing...
        </span>
      </div>
    );
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
