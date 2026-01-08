import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ohviqihuuoiwmpckifnt.supabase.co'
const supabaseAnonKey = 'sb_publishable_MxmhGuL4yuXy-GHYjx-K8Q_EpLbmHuO'

// Ton client actuel (exporté tel quel pour tes pages "use client")
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})