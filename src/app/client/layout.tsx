import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default async function ClientLayout({ children }) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/connexion');
  }

  return children;
}
