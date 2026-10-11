import { supabase } from '@/lib/supabase';

export function clearClientStorage() {
  if (typeof window === 'undefined') return;

  window.localStorage.clear();
  window.sessionStorage.clear();
}

export async function signOutAndClearClientSession() {
  try {
    await supabase.auth.signOut();
  } finally {
    clearClientStorage();
  }
}