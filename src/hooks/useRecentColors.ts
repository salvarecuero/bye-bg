import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'bye-bg:recentColors';
const MAX_RECENT = 5;

export function useRecentColors() {
  const [recentColors, setRecentColors] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentColors(JSON.parse(stored));
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const addRecentColor = useCallback((color: string) => {
    const normalizedColor = color.toLowerCase();

    setRecentColors(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== normalizedColor);
      const updated = [normalizedColor, ...filtered].slice(0, MAX_RECENT);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // localStorage not available
      }

      return updated;
    });
  }, []);

  const clearRecentColors = useCallback(() => {
    setRecentColors([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage not available
    }
  }, []);

  return { recentColors, addRecentColor, clearRecentColors };
}
