import { useState, useEffect } from 'react';
import { CUSTOM_QUOTES, type CustomQuote } from '@/content/quotes';

export function useQuote(intervalMs = 30000): CustomQuote {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * CUSTOM_QUOTES.length));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % CUSTOM_QUOTES.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return CUSTOM_QUOTES[index];
}
