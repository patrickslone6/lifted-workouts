const configuredBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const productionBase = 'https://lifted-workouts.onrender.com';
export const API_BASE_URL = configuredBase || productionBase;

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  try {
    return await window.fetch(apiUrl(path), { ...init, signal: init.signal || controller.signal, headers: { Accept: 'application/json', ...(init.headers || {}) } });
  } finally { window.clearTimeout(timeout); }
}

// The app has a few older modules that still call fetch('/api/...'). Keep those
// calls working on GitHub Pages, but preserve the native fetch implementation for
// every other request. This avoids the recursive fetch wrapping that can produce
// minified Safari errors such as "w is not a function".
if (typeof window !== 'undefined' && !(window as any).__liftedApiFetchPatched) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) return nativeFetch(apiUrl(input), init);
    if (input instanceof URL && input.pathname.startsWith('/api/')) return nativeFetch(apiUrl(input.pathname + input.search), init);
    return nativeFetch(input, init);
  };
  (window as any).__liftedApiFetchPatched = true;
}
