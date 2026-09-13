const configuredBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

// GitHub Pages serves the React app from a different origin than the Render API.
// Keep the API origin configurable, but provide the production Render default so
// Safari/iPhone builds do not accidentally request /api/* from GitHub Pages.
const productionBase = 'https://lifted-workouts-api.onrender.com';
export const API_BASE_URL = configuredBase || productionBase;

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25000);
  try {
    return await fetch(apiUrl(path), {
      ...init,
      signal: init.signal || controller.signal,
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

// Existing screens use relative /api/* URLs. Rewrite those centrally so the
// same frontend works on GitHub Pages, Render, and local Vite development.
if (typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let nextInput = input;
    if (typeof input === 'string' && input.startsWith('/api/')) {
      nextInput = apiUrl(input);
    } else if (input instanceof URL && input.pathname.startsWith('/api/')) {
      nextInput = new URL(apiUrl(`${input.pathname}${input.search}`));
    } else if (typeof Request !== 'undefined' && input instanceof Request && new URL(input.url).pathname.startsWith('/api/')) {
      const requestUrl = new URL(input.url);
      nextInput = new Request(apiUrl(`${requestUrl.pathname}${requestUrl.search}`), input);
    }
    return nativeFetch(nextInput, init);
  }) as typeof window.fetch;
}
