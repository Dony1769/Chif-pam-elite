// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = 'https://ohviqihuuoiwmpckifnt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Ton vrai token

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)