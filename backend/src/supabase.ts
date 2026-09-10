/**
 * Single shared Supabase client for the API process.
 *
 * Sessions are disabled because this is a stateless server: every request is
 * authorised by the key above, never by an end-user JWT.
 */
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const supabase = createClient(env.SUPABASE_URL, env.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-application-name': 'bheral-api' } },
});

/** Cheap connectivity probe used by GET /api/health. */
export async function pingDatabase(): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('bss_products').select('id').limit(1);
  return error ? { ok: false, error: error.message } : { ok: true };
}
