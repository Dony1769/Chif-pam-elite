// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Les variables NEXT_PUBLIC_* sont inlinées par Next.js dans le bundle client.
// Elles peuvent être absentes au moment du prerender (build Vercel) si les env
// vars ne sont pas configurées — on ne doit jamais thrower au niveau module,
// sinon tout le build échoue ("Missing required environment variable").
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isProduction = process.env.NODE_ENV === 'production';

if (!supabaseUrl || !supabaseAnonKey) {
  // Avertissement uniquement en développement : le build ne doit pas échouer.
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      "[supabase] Variables d'environnement manquantes : définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local)."
    );
  }
}

// Création paresseuse : le client n'est instancié qu'à la première utilisation
// (côté navigateur), jamais pendant le prerender du build.
let client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
      cookieOptions: {
        sameSite: 'lax',
        secure: isProduction,
      },
      isSingleton: true,
    }) as unknown as SupabaseClient;
  }
  return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabase();
    const value = Reflect.get(instance, prop);
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
