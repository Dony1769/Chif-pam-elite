// server-supabase.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Export direct d'une fonction avec le nom cohérent pour toutes tes pages
export function supabaseServer() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookies().get(name)?.value
        },
      },
    }
  )
}
