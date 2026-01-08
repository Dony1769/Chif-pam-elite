import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server'; // Assure-toi d'utiliser le client server-side

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Protection stricte : redirection si non connecté
  if (!user) {
    redirect('/connexion');
  }

  return <>{children}</>;
}
