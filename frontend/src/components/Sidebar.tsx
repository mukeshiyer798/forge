import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Target, BookOpen, Settings, LogOut, Menu, X, BarChart3, Sun, Moon } from 'lucide-react';
import { useAppStore, type ViewId } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const NAV_ITEMS: { id: ViewId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & streak' },
  { id: 'goals', label: 'My Goals', icon: Target, description: 'Track your goals' },
  { id: 'executive', label: 'Summary', icon: BarChart3, description: 'Progress & risk view' },
  { id: 'reading', label: 'Reading', icon: BookOpen, description: 'Motivation & resources' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'Preferences' },
];

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('forge-theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(isDark ? 'dark' : 'light');
    localStorage.setItem('forge-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark(d => !d) };
}

function NavContent({ onClose }: { onClose?: () => void }) {
  const { user, streak, activeView, setActiveView, logout } = useAppStore();
  const { isDark, toggle: toggleTheme } = useTheme();

  const handleNav = (id: ViewId) => { setActiveView(id); onClose?.(); };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5 border-b border-forge-border flex items-center justify-between">
        <div>
          <h1 className="font-display text-[32px] tracking-widest text-forge-text leading-none">
            FORGE<span className="text-forge-amber">.</span>
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-forge-muted mt-1">
            // Consistency over ambition
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-forge-dim hover:text-forge-amber transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="text-forge-dim hover:text-forge-text transition-colors p-1">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* User */}
      <div className="px-5 py-4 border-b border-forge-border flex items-center gap-3">
        <div className="w-9 h-9 bg-forge-amber flex items-center justify-center font-display text-xl text-forge-bg flex-shrink-0">
          {user?.avatarInitial ?? 'U'}
        </div>
        <div className="min-w-0">
          <p className="font-body font-bold text-sm text-forge-text truncate">{user?.name ?? 'Warrior'}</p>
          <p className="font-mono text-[11px] text-forge-dim truncate">{user?.email ?? ''}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button key={item.id} id={`nav-${item.id}`} onClick={() => handleNav(item.id)}
              className={cn('nav-link w-full text-left group relative', isActive && 'active')}>
              <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-semibold leading-none', isActive ? 'text-forge-amber' : 'text-forge-dim group-hover:text-forge-text')}>
                  {item.label}
                </div>
                <div className="text-[11px] text-forge-muted mt-0.5 font-mono">{item.description}</div>
              </div>
              {isActive && (
                <motion.div layoutId="nav-indicator" className="absolute right-2 w-1.5 h-1.5 rounded-full bg-forge-amber" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Streak */}
      <div className="mx-4 mb-4">
        <div className="bg-forge-surface2 border border-forge-border px-4 py-3 flex items-center gap-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />
          <motion.span animate={{ rotate: [-4, 4, -4] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-2xl inline-block">🔥</motion.span>
          <div>
            <div className="font-display text-3xl text-forge-fire leading-none">{streak}</div>
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-forge-dim">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-forge-border pt-3">
        <button onClick={() => { logout(); onClose?.(); }} className="nav-link w-full text-left">
          <LogOut size={14} strokeWidth={2} />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { mobileNavOpen, setMobileNavOpen, streak } = useAppStore();

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-[260px] min-h-screen bg-forge-surface border-r border-forge-border flex-col sticky top-0 h-screen flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-forge-surface border-b border-forge-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileNavOpen(true)} className="text-forge-dim hover:text-forge-text transition-colors p-1">
            <Menu size={20} />
          </button>
          <span className="font-display text-2xl tracking-widest text-forge-text">FORGE<span className="text-forge-amber">.</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🔥</span>
          <span className="font-display text-xl text-forge-fire">{streak}</span>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] bg-forge-surface border-r border-forge-border z-50 flex flex-col overflow-y-auto pointer-events-auto">
              <NavContent onClose={() => setMobileNavOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
