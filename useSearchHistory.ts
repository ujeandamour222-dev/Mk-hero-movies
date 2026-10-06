import { useState, useEffect, useCallback } from 'react';

const SEARCH_HISTORY_KEY = 'mk_search_history';
const MAX_HISTORY_ITEMS = 8;

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter((item) => typeof item === 'string' && item.trim().length > 0));
        }
      }
    } catch (e) {
      console.error('Failed to load search history:', e);
    }
  }, []);

  // Save search term
  const saveSearchTerm = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save search term:', e);
      }
      return updated;
    });
  }, []);

  // Remove single term
  const removeSearchTerm = useCallback((termToRemove: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== termToRemove.toLowerCase());
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to remove search term:', e);
      }
      return updated;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (e) {
      console.error('Failed to clear search history:', e);
    }
  }, []);

  return {
    history,
    saveSearchTerm,
    removeSearchTerm,
    clearHistory,
  };
}
