import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, userId } = await req.json();

    if (!amount || amount < 25) {
      return NextResponse.json(
        { error: 'Montant invalide (Minimum 25 HTG)' },
        { status: 400 }
      );
    }

    // Récupération de la clé secrète stockée dans les variables d'environnement
    const secretKey = process.env.MONCASH_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Clé API MonCash non configurée sur le serveur.' },
        { status: 500 }
      );
    }

    // Génération d'une référence d'ordre unique
    const referenceId = `order_${userId}_${Date.now()}`;

    // Appel à l'API MonCash Connect pour créer le paiement
    const response = await fetch('https://api.moncashconnect.com/v1/pay-create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Number(amount),
        referenceId: referenceId,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chifpam.com'}/client/finance?status=success`,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.paymentUrl) {
      throw new Error(data.message || 'Impossible d\'initialiser le paiement MonCash.');
    }

    return NextResponse.json({ paymentUrl: data.paymentUrl, referenceId });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur lors de la création du paiement.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

