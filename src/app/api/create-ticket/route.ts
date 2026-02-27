import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/server-supabase'; // Client configuré pour le serveur (utilise cookies() pour le RLS)

// --- TYPES ---
interface BetSelectionInput {
  match_id: string | number;
  selected_outcome: 'home' | 'draw' | 'away';
  odds: number;
}

interface CreateTicketBody {
  stake: number;
  selections: BetSelectionInput[];
}

export async function POST(request: Request) {
  try {
    // 1. Vérification de l'authentification & Respect RLS
    // Supabase va lire les cookies de la requête pour identifier l'utilisateur
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Action non autorisée. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    // Récupération et parsing sécurisé du body
    const body = await request.json();
    const { stake, selections } = body as CreateTicketBody;

    // 2. Validation stricte des données d'entrée
    if (typeof stake !== 'number' || stake <= 0) {
      return NextResponse.json(
        { success: false, message: "La mise (stake) doit être un nombre strictement positif." },
        { status: 400 }
      );
    }

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json(
        { success: false, message: "Le ticket doit contenir au moins une sélection." },
        { status: 400 }
      );
    }

    for (const sel of selections) {
      if (!sel.match_id) {
        return NextResponse.json(
          { success: false, message: "L'ID du match est manquant." },
          { status: 400 }
        );
      }
      if (!['home', 'draw', 'away'].includes(sel.selected_outcome)) {
        return NextResponse.json(
          { success: false, message: "Le résultat sélectionné est invalide." },
          { status: 400 }
        );
      }
      if (typeof sel.odds !== 'number' || sel.odds <= 1) {
        return NextResponse.json(
          { success: false, message: "Les cotes doivent être supérieures à 1.00." },
          { status: 400 }
        );
      }
    }

    // 3. Calculs des métriques côté serveur (Sécurité anti-fraude)
    const serverTotalOdds = selections.reduce((acc, sel) => acc * sel.odds, 1);
    const serverPotentialProfit = stake * serverTotalOdds;

    // 4. Insertion du Ticket Maître
    const { data: ticket, error: ticketError } = await supabase
      .from('bets_tickets')
      .insert({
        user_id: user.id,
        stake: parseFloat(stake.toFixed(2)),
        total_odds: parseFloat(serverTotalOdds.toFixed(2)),
        total_profit: parseFloat(serverPotentialProfit.toFixed(2)),
        status: 'pending'
      })
      .select('id')
      .single();

    if (ticketError || !ticket) {
      // Log serveur uniquement, ne pas exposer l'erreur SQL au client
      console.error("[API CreateTicket] Erreur DB lors de la création du ticket:", ticketError);
      return NextResponse.json(
        { success: false, message: "Erreur interne lors de la création du ticket." },
        { status: 500 }
      );
    }

    const ticketId = ticket.id;

    // 5. Préparation et insertion des Sélections liées
    const selectionsToInsert = selections.map((sel) => ({
      ticket_id: ticketId,
      match_id: sel.match_id,
      selected_outcome: sel.selected_outcome,
      odds: parseFloat(sel.odds.toFixed(2))
    }));

    const { error: selectionsError } = await supabase
      .from('bet_selections')
      .insert(selectionsToInsert);

    if (selectionsError) {
      console.error("[API CreateTicket] Erreur DB sur les sélections:", selectionsError);
      // En l'absence de transactions SQL natives via l'API REST de Supabase,
      // on pourrait faire un appel .delete() sur le ticket ici en cas d'échec pour "rollback".
      return NextResponse.json(
        { success: false, message: "Le ticket a été créé, mais une erreur est survenue sur les pronostics." },
        { status: 500 }
      );
    }

    // 6. Réponse de Succès
    return NextResponse.json(
      { 
        success: true, 
        ticket_id: ticketId, 
        message: "Ticket généré avec succès !" 
      },
      { status: 200 }
    );

  } catch (error) {
    // Intercepte les erreurs de parsing JSON ou crash système
    console.error("[API CreateTicket] Erreur fatale non gérée:", error);
    return NextResponse.json(
      { success: false, message: "Erreur système inattendue." },
      { status: 500 }
    );
  }
}
