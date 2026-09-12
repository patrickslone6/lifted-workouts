const configuredBase = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

export const API_BASE_URL = configuredBase;

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}

// Existing screens use relative /api/* URLs. Rewrite those centrally so the
// same frontend can talk to a separately hosted API while still working with
// the local Vite server during development.
if (typeof window !== 'undefined' && API_BASE_URL) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = apiUrl(input);
    } else if (input instanceof URL && input.pathname.startsWith('/api/')) {
      input = new URL(apiUrl(`${input.pathname}${input.search}`));
    } else if (typeof Request !== 'undefined' && input instanceof Request && input.url.includes('/api/')) {
      const requestUrl = new URL(input.url);
      if (requestUrl.pathname.startsWith('/api/')) {
        input = new Request(apiUrl(`${requestUrl.pathname}${requestUrl.search}`), input);
      }
    }
    return nativeFetch(input, init);
  }) as typeof window.fetch;
}
