// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

function requireEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'): string {
	const value =
		name === 'NEXT_PUBLIC_SUPABASE_URL'
			? process.env.NEXT_PUBLIC_SUPABASE_URL
			: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const isProduction = process.env.NODE_ENV === 'production';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    sameSite: 'lax',
    secure: isProduction,
  },
  isSingleton: true,
});