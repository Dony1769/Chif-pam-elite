import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// On exporte directement une fonction pour créer le client côté server
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
