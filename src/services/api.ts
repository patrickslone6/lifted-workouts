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
    return await fetch(apiUrl(path), {
      ...init,
      signal: init.signal || controller.signal,
      headers: { Accept: 'application/json', ...(init.headers || {}) },
    });
  } finally {
    window.clearTimeout(timeout);
  }
}
