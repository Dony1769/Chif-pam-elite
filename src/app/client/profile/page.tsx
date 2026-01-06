import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) { return (await cookieStore).get(name)?.value },
      },
    }
  )

  // 1. Récupérer la session actuelle
  const { data: { session } } = await supabase.auth.getSession()

  // 2. Si pas de session, retour à la connexion (Sécurité dossier maître)
  if (!session) {
    redirect('/connexion')
  }

  // 3. Récupérer les infos du profil et les transactions depuis Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name, solde, avatar_url')
    .eq('id', session.user.id)
    .single()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white shadow rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-6 text-blue-600">Mon Profil Client</h1>
      
      <div className="space-y-4 border-b pb-6">
        <div>
          <label className="block text-sm font-medium text-gray-500">Nom d'utilisateur</label>
          <p className="text-lg font-semibold">{profile?.username || 'Non défini'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Email (Identifiant)</label>
          <p className="text-lg font-semibold">{session.user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-500">Solde Actuel</label>
          <p className="text-xl font-bold text-green-600">{profile?.solde || 0} HTG</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Dernières Transactions</h2>
        <div className="space-y-2">
          {transactions?.map((t) => (
            <div key={t.id} className="flex justify-between p-3 bg-gray-50 rounded border">
              <span>{new Date(t.created_at).toLocaleDateString()} - {t.type}</span>
              <span className={t.montant > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                {t.montant} HTG
              </span>
            </div>
          )) || <p className="text-gray-400">Aucune transaction récente.</p>}
        </div>
      </div>

      <button className="mt-8 w-full bg-red-500 text-white py-2 rounded font-bold hover:bg-red-600 transition">
        Changer le mot de passe
      </button>
    </div>
  )
}