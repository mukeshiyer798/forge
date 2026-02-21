import * as Toast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
};

type ToastApi = {
  toast: (t: Omit<ToastItem, 'id'>) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function toneClasses(tone: ToastItem['tone']) {
  switch (tone) {
    case 'success':
      return 'border-green-900/40 bg-green-950/20 text-green-200';
    case 'warning':
      return 'border-amber-900/40 bg-amber-950/20 text-amber-100';
    case 'error':
      return 'border-red-900/40 bg-red-950/20 text-red-100';
    default:
      return 'border-forge-border bg-forge-surface2 text-forge-text';
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setItems((prev) => [...prev, { ...t, id }]);
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      <Toast.Provider swipeDirection="right">
        {children}
        {items.map((t) => (
          <Toast.Root
            key={t.id}
            className={`border px-4 py-3 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out ${toneClasses(
              t.tone
            )}`}
            duration={3500}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((x) => x.id !== t.id));
            }}
          >
            <Toast.Title className="font-condensed font-black uppercase tracking-wider text-sm">
              {t.title}
            </Toast.Title>
            {t.description ? (
              <Toast.Description className="font-mono text-xs text-forge-dim mt-1">
                {t.description}
              </Toast.Description>
            ) : null}
          </Toast.Root>
        ))}
        <Toast.Viewport className="fixed bottom-4 right-4 z-[60] flex w-[360px] max-w-[92vw] flex-col gap-2 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { toast: () => {} };
  }
  return ctx;
}

