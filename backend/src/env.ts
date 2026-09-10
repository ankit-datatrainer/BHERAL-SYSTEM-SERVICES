/**
 * Environment loading and validation. Fails fast and loudly at boot rather
 * than surfacing a confusing 500 on the first database call.
 */
import 'dotenv/config';
import { z } from 'zod';

/** An unset key is often left in .env as an empty string; treat that as absent. */
const optionalKey = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.string().min(20, 'key looks too short to be valid').optional(),
);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  /**
   * Preferred credential. A service-role key bypasses RLS, which is what a
   * trusted server-side API wants. Falls back to the publishable/anon key,
   * in which case the RLS policies in the migration govern what the API can do.
   */
  SUPABASE_SERVICE_ROLE_KEY: optionalKey,
  SUPABASE_ANON_KEY: optionalKey,
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid backend environment configuration:\n${issues}\n\nCopy .env.example to .env and fill it in.`);
}

const raw = parsed.data;

if (!raw.SUPABASE_SERVICE_ROLE_KEY && !raw.SUPABASE_ANON_KEY) {
  throw new Error('Set SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY in backend/.env');
}

export const env = {
  ...raw,
  supabaseKey: raw.SUPABASE_SERVICE_ROLE_KEY ?? raw.SUPABASE_ANON_KEY!,
  usingServiceRole: Boolean(raw.SUPABASE_SERVICE_ROLE_KEY),
  corsOrigins: raw.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};
