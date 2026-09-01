const STORAGE_KEY = "genova-recently-viewed";
const MAX_ITEMS = 20;

export interface RecentProduct {
  slug: string;
  title: string;
  price: number;
  coverImage?: string;
  category: string;
  timestamp: number;
}

export function getRecentlyViewed(): RecentProduct[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addToRecentlyViewed(product: Omit<RecentProduct, "timestamp">) {
  try {
    const items = getRecentlyViewed();
    // Remove duplicate
    const filtered = items.filter((i) => i.slug !== product.slug);
    // Add to beginning
    filtered.unshift({ ...product, timestamp: Date.now() });
    // Limit size
    const limited = filtered.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function clearRecentlyViewed() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
