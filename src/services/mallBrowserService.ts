import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_MALLS,
  MALL_FAVORITES_KEY,
  MALL_RECENT_KEY,
  MAX_MALL_RECENT,
  getMallDisplayName,
  normalizeMallUrl,
  type MallEntry,
} from '../constants/malls';

export type RecentMallItem = {
  id: string;
  name: string;
  url: string;
  visitedAt: number;
};

export async function getFavoriteMallIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(MALL_FAVORITES_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function toggleFavoriteMall(mallId: string): Promise<string[]> {
  const current = await getFavoriteMallIds();
  const next = current.includes(mallId)
    ? current.filter(id => id !== mallId)
    : [...current, mallId];
  await AsyncStorage.setItem(MALL_FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export async function getRecentMalls(): Promise<RecentMallItem[]> {
  const raw = await AsyncStorage.getItem(MALL_RECENT_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addRecentMall(params: {
  url: string;
  name?: string;
}): Promise<RecentMallItem[]> {
  const url = normalizeMallUrl(params.url);
  if (!url) {
    return getRecentMalls();
  }

  const item: RecentMallItem = {
    id: `recent-${Date.now()}`,
    name: getMallDisplayName(url, params.name),
    url,
    visitedAt: Date.now(),
  };

  const current = await getRecentMalls();
  const deduped = [
    item,
    ...current.filter(entry => entry.url !== url),
  ].slice(0, MAX_MALL_RECENT);

  await AsyncStorage.setItem(MALL_RECENT_KEY, JSON.stringify(deduped));
  return deduped;
}

export async function removeRecentMall(id: string): Promise<RecentMallItem[]> {
  const current = await getRecentMalls();
  const next = current.filter(entry => entry.id !== id);
  await AsyncStorage.setItem(MALL_RECENT_KEY, JSON.stringify(next));
  return next;
}

export function findMallByUrl(url: string): MallEntry | undefined {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return DEFAULT_MALLS.find(m => host.includes(m.host));
  } catch {
    return undefined;
  }
}

export function filterMalls(query: string): MallEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return DEFAULT_MALLS;
  }
  return DEFAULT_MALLS.filter(
    mall =>
      mall.name.toLowerCase().includes(q) ||
      mall.url.toLowerCase().includes(q) ||
      mall.host.toLowerCase().includes(q),
  );
}

/** WebView inject: collect large product-like image URLs from the page */
export const EXTRACT_PAGE_IMAGES_JS = `
(function() {
  try {
    var urls = [];
    var seen = {};
    function add(u) {
      if (!u || typeof u !== 'string') return;
      u = u.trim();
      if (u.indexOf('data:') === 0) return;
      if (u.indexOf('//') === 0) u = location.protocol + u;
      if (u.indexOf('http') !== 0) {
        try { u = new URL(u, location.href).href; } catch (e) { return; }
      }
      if (seen[u]) return;
      seen[u] = true;
      urls.push(u);
    }

    var og = document.querySelector('meta[property="og:image"]');
    if (og && og.content) add(og.content);

    var imgs = Array.prototype.slice.call(document.images || []);
    imgs.forEach(function(img) {
      var w = img.naturalWidth || img.width || 0;
      var h = img.naturalHeight || img.height || 0;
      if (w < 120 || h < 120) return;
      add(img.currentSrc || img.src);
      var srcset = img.getAttribute('srcset');
      if (srcset) {
        var parts = srcset.split(',');
        var last = parts[parts.length - 1];
        if (last) add(last.trim().split(' ')[0]);
      }
    });

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'EXTRACT_IMAGES',
      images: urls.slice(0, 24),
      pageUrl: location.href,
      pageTitle: document.title || ''
    }));
  } catch (err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'EXTRACT_IMAGES_ERROR',
      message: String(err && err.message ? err.message : err)
    }));
  }
})();
true;
`;
