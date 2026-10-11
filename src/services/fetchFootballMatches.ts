// /src/services/fetchFootballMatches.ts

// ============================================================================
// TYPES STRICTS
// ============================================================================

export interface FootballMatchRaw {
  fixture: {
    id: number;
    date: string;
    status: {
      long: string;
      short: string;
      elapsed: number | null;
    };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
  };
  teams: {
    home: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
    away: {
      id: number;
      name: string;
      logo: string;
      winner: boolean | null;
    };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
}

interface ApiFootballResponse {
  get: string;
  results: number;
  errors: Record<string, string> | []; // L'API peut renvoyer un tableau vide ou un objet d'erreurs
  response: FootballMatchRaw[];
}

// ============================================================================
// CONSTANTES DE CONFIGURATION
// ============================================================================

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 secondes entre chaque tentative
const FETCH_TIMEOUT_MS = 15000; // 15 secondes max par requête

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Fonction utilitaire pour mettre en pause l'exécution (sleep)
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calcule les dates de début et de fin pour la requête API
 * @returns Tuple contenant [fromDate, toDate] au format YYYY-MM-DD
 */
const getDateRange = (): [string, string] => {
  const today = new Date();
  
  // Format YYYY-MM-DD
  const fromDate = today.toISOString().split('T')[0];
  
  const toDateObj = new Date(today);
  toDateObj.setDate(today.getDate() + 3);
  const toDate = toDateObj.toISOString().split('T')[0];

  return [fromDate, toDate];
};

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

/**
 * Récupère les matchs de football d'aujourd'hui jusqu'à J+3.
 * Inclut un mécanisme de Retry et un Timeout sécurisé.
 * * @throws {Error} Si la clé API est manquante ou si l'API échoue après X tentatives.
 * @returns {Promise<FootballMatchRaw[]>} Tableau brut des matchs renvoyés par l'API.
 */
export async function fetchFootballMatches(): Promise<FootballMatchRaw[]> {
  // 1. Validation critique de l'environnement (Pas de NEXT_PUBLIC ici)
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    throw new Error("[FATAL] FOOTBALL_API_KEY est introuvable dans les variables d'environnement.");
  }

  const [fromDate, toDate] = getDateRange();
  // URL de base de l'API-Sports (à adapter si tu utilises un autre fournisseur)
  const apiUrl = `https://v3.football.api-sports.io/fixtures?from=${fromDate}&to=${toDate}&timezone=Europe/Paris`;

  let attempt = 1;

  // 2. Boucle de Retry
  while (attempt <= MAX_RETRIES) {
    console.log(`[FetchMatches] Tentative ${attempt}/${MAX_RETRIES} - Récupération des matchs du ${fromDate} au ${toDate}...`);
    
    // 3. Configuration du Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      // 4. Appel réseau (fetch natif Node.js)
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-apisports-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'Accept': 'application/json'
        },
        signal: controller.signal,
        // Cache optionnel : on évite le cache Next.js par défaut pour avoir des données fraîches
        cache: 'no-store' 
      });

      clearTimeout(timeoutId); // Nettoyage du timeout en cas de succès réseau

      // 5. Gestion des erreurs HTTP (Ex: 401 Unauthorized, 429 Too Many Requests, 500)
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ApiFootballResponse;

      // 6. Gestion des erreurs logiques de l'API (L'API renvoie 200 OK mais indique des erreurs dans le JSON)
      if (data.errors && (!Array.isArray(data.errors) || data.errors.length > 0)) {
        throw new Error(`Erreur logique API: ${JSON.stringify(data.errors)}`);
      }

      console.log(`[FetchMatches] Succès : ${data.results} matchs récupérés.`);
      
      // Retour immédiat des données brutes
      return data.response;

    } catch (error: unknown) {
      clearTimeout(timeoutId); // Toujours nettoyer le timeout en cas d'erreur
      
      const isAbortError = error instanceof Error && error.name === 'AbortError';
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`[FetchMatches] Échec lors de la tentative ${attempt}: ${isAbortError ? 'TIMEOUT' : errorMessage}`);

      // 7. Logique d'abandon ou de nouvelle tentative
      if (attempt === MAX_RETRIES) {
        throw new Error(`[FetchMatches] Échec définitif après ${MAX_RETRIES} tentatives. Dernière erreur: ${errorMessage}`);
      }

      console.log(`[FetchMatches] Attente de ${RETRY_DELAY_MS}ms avant la prochaine tentative...`);
      await delay(RETRY_DELAY_MS);
      attempt++;
    }
  }

  // Fallback TypeScript de sécurité (théoriquement inatteignable grâce au throw dans la boucle)
  return [];
}
