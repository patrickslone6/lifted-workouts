const configuredBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

// GitHub Pages and the Render API are separate origins in production. The
// Pages workflow already uses this Render service, so keep the same default
// here for Safari/iPhone builds and direct local previews.
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
    return await fetch(apiUrl(path), {
      ...init,
      signal: init.signal || controller.signal,
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

if (typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    let nextInput = input;
    if (typeof input === 'string' && input.startsWith('/api/')) nextInput = apiUrl(input);
    else if (input instanceof URL && input.pathname.startsWith('/api/')) nextInput = new URL(apiUrl(`${input.pathname}${input.search}`));
    else if (typeof Request !== 'undefined' && input instanceof Request && new URL(input.url).pathname.startsWith('/api/')) {
      const requestUrl = new URL(input.url);
      nextInput = new Request(apiUrl(`${requestUrl.pathname}${requestUrl.search}`), input);
    }
    return nativeFetch(nextInput, init);
  }) as typeof window.fetch;
}
