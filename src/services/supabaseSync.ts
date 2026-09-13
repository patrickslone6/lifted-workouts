import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const supabaseConfigured = Boolean(url && key);
export const supabase: SupabaseClient | null = supabaseConfigured ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

const TABLE = 'lifted_user_data';

export async function saveSupabaseData(identifier: string, data: unknown): Promise<boolean> {
  if (!supabase || !identifier) return false;
  const { error } = await supabase.from(TABLE).upsert({
    account_key: identifier.trim().toLowerCase(),
    data,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'account_key' });
  if (error) {
    console.warn('Supabase save failed:', error.message);
    return false;
  }
  return true;
}

export async function loadSupabaseData(identifier: string): Promise<any | null> {
  if (!supabase || !identifier) return null;
  const { data, error } = await supabase.from(TABLE).select('data').eq('account_key', identifier.trim().toLowerCase()).maybeSingle();
  if (error) {
    console.warn('Supabase load failed:', error.message);
    return null;
  }
  return data?.data ?? null;
}

export async function deleteSupabaseData(identifier: string): Promise<boolean> {
  if (!supabase || !identifier) return false;
  const { error } = await supabase.from(TABLE).delete().eq('account_key', identifier.trim().toLowerCase());
  if (error) {
    console.warn('Supabase delete failed:', error.message);
    return false;
  }
  return true;
}
