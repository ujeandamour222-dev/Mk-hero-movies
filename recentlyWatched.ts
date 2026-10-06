export interface RecentlyWatchedItem {
  id: string;
  title: string;
  posterUrl: string;
  category?: string;
  contentType: 'movie' | 'series';
  viewedAt: string;
}

const STORAGE_KEY = 'mk_recently_watched';

export function getRecentlyWatched(): RecentlyWatchedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function saveRecentlyWatchedItem(item: {
  id: string;
  title: string;
  posterUrl?: string;
  category?: string;
  contentType: 'movie' | 'series';
}) {
  if (!item.id || !item.title) return;
  try {
    const current = getRecentlyWatched();
    // Remove duplicate if exists
    const filtered = current.filter((i) => i.id !== item.id);

    const newItem: RecentlyWatchedItem = {
      id: item.id,
      title: item.title,
      posterUrl: item.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500',
      category: item.category || 'Agasobanuye',
      contentType: item.contentType,
      viewedAt: new Date().toISOString(),
    };

    // Prepend new item and keep top 10
    const updated = [newItem, ...filtered].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch event so UI updates live
    window.dispatchEvent(new Event('mk-recently-watched-updated'));
  } catch (err) {
    console.error('Failed to save recently watched item:', err);
  }
}
