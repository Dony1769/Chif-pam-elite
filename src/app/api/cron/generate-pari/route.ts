import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- TYPES DE L'API FOOTBALL (Exemple basé sur API-Sports) ---
interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
  };
  league: {
    name: string;
    country: string;
  };
  teams: {
    home: { name: string };
    away: { name: string };
  };
}

interface ApiFootballResponse {
  errors: any[];
  response: ApiFootballFixture[];
}

// --- TYPE DE NOTRE BASE DE DONNÉES ---
interface PariPredictionInsert {
  id: string; // On utilisera l'ID de l'API converti en string
  home_team: string;
  away_team: string;
  league: string;
  match_date: string;
  expected_goals_home: number;
  expected_goals_away: number;
  probability_home: number;
  probability_draw: number;
  probability_away: number;
  over25_prob: number;
  value_home: boolean;
  value_draw: boolean;
  value_away: boolean;
  value_detected: boolean;
}

// Initialisation du client Supabase ADMIN (Bypass RLS pour le Cron)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // NE JAMAIS EXPOSER CETTE CLÉ AU CLIENT
  {
    auth: { persistSession: false } // Pas besoin de session pour un script backend
  }
);

// Configuration Next.js 16 pour forcer l'exécution dynamique
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Autorise la fonction Vercel à tourner jusqu'à 60s max

export async function GET(request: Request) {
  console.log("[CRON] Début du job generate-pari");

  // 1. SÉCURITÉ : Vérification du CRON_SECRET
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[CRON] Tentative d'accès non autorisée");
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  // Vérification des variables d'environnement critiques
  if (!process.env.FOOTBALL_API_KEY) {
    console.error("[CRON] FOOTBALL_API_KEY manquante");
    return NextResponse.json({ success: false, message: 'Configuration server manquante' }, { status: 500 });
  }

  try {
    // 2. GESTION DES DATES (Aujourd'hui + 3 jours)
    const today = new Date();
    const fromDate = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    const toDateObj = new Date(today);
    toDateObj.setDate(today.getDate() + 3);
    const toDate = toDateObj.toISOString().split('T')[0];

    // 3. APPEL API FOOTBALL AVEC TIMEOUT SÉCURISÉ
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Timeout 15 secondes

    console.log(`[CRON] Fetch des matchs du ${fromDate} au ${toDate}`);
    
    const apiUrl = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}&timezone=Europe/Paris`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-apisports-key': process.env.FOOTBALL_API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur API Football: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ApiFootballResponse;

    if (data.errors && data.errors.length > 0) {
      throw new Error(`Erreur logique API Football: ${JSON.stringify(data.errors)}`);
    }

    const fixtures = data.response;
    console.log(`[CRON] ${fixtures.length} matchs récupérés de l'API.`);

    if (fixtures.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, updated: 0, message: "Aucun match trouvé." });
    }

    // 4. TRANSFORMATION DES DONNÉES
    // Optionnel : Filtrer uniquement les grandes ligues (ex: Serie A, Premier League) si nécessaire
    const predictionsToUpsert: PariPredictionInsert[] = fixtures.map((item) => {
      
      // Ici, idéalement, tu fais appel à ton service `/services/matchEngine.ts`
      // Ex: const stats = analyzeMatch(item);
      
      // Pour cet exemple, je génère des probabilités basiques pour respecter le typage de ta table
      // À remplacer par la vraie logique de ton algorithme
      const fakeXgHome = Number((Math.random() * 2 + 0.5).toFixed(2));
      const fakeXgAway = Number((Math.random() * 2 + 0.5).toFixed(2));

      return {
        id: item.fixture.id.toString(), // On utilise l'ID de l'API comme Primary Key pour éviter les doublons
        home_team: item.teams.home.name,
        away_team: item.teams.away.name,
        league: `${item.league.country} - ${item.league.name}`,
        match_date: item.fixture.date, // Format ISO complet
        
        // --- DONNÉES GÉNÉRÉES PAR LE MOTEUR (À REMPLACER PAR matchEngine.ts) ---
        expected_goals_home: fakeXgHome,
        expected_goals_away: fakeXgAway,
        probability_home: 45.0,
        probability_draw: 25.0,
        probability_away: 30.0,
        over25_prob: 55.0,
        value_home: false,
        value_draw: false,
        value_away: false,
        value_detected: false,
      };
    });

    // 5. UPSERT DANS SUPABASE
    // Upsert permet d'insérer, ou de mettre à jour si l'ID (fixture_id) existe déjà.
    const { data: upsertData, error: upsertError } = await supabaseAdmin
      .from('pari_predictions')
      .upsert(predictionsToUpsert, { 
        onConflict: 'id', 
        ignoreDuplicates: false // false = met à jour les données existantes (ex: heure modifiée)
      })
      .select('id');

    if (upsertError) {
      console.error("[CRON] Erreur lors de l'Upsert Supabase:", upsertError);
      throw new Error(`Erreur Base de données: ${upsertError.message}`);
    }

    // 6. RETOUR DE SUCCÈS
    console.log(`[CRON] Succès. ${upsertData?.length || 0} lignes traitées.`);
    
    return NextResponse.json({ 
      success: true, 
      processed_count: upsertData?.length || 0,
      message: "Base de données mise à jour avec succès."
    }, { status: 200 });

  } catch (error: any) {
    // 7. GESTION DES ERREURS & TIMEOUTS
    if (error.name === 'AbortError') {
      console.error("[CRON] Timeout: L'API Football a mis trop de temps à répondre.");
      return NextResponse.json({ success: false, message: 'API Timeout' }, { status: 504 });
    }

    console.error("[CRON] Erreur fatale:", error.message || error);
    
    // On renvoie 500 mais Vercel Cron logguera l'échec et pourra relancer (retry) si configuré
    return NextResponse.json({ success: false, message: 'Erreur Serveur Interne' }, { status: 500 });
  }
}
