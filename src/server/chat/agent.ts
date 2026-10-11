import { isSafeInternalPath, sanitizePlainText } from '@/lib/security';

export type AgentContext = {
  username: string | null;
  role: string | null;
  balance: number;
  jetonsCp: number;
  xp: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  activeChallenges: number;
};

export type AgentDecision = {
  replyContent: string;
  actionType: string;
};

type ActionPayload = {
  type: 'action';
  text: string;
  actionLabel: string;
  actionUrl: string;
};

function buildActionPayload(payload: ActionPayload): string {
  const safeUrl = isSafeInternalPath(payload.actionUrl) ? payload.actionUrl : '/client/help';

  return JSON.stringify({
    type: 'action',
    text: sanitizePlainText(payload.text, 280),
    actionLabel: sanitizePlainText(payload.actionLabel, 40),
    actionUrl: safeUrl,
  });
}

export function decideAgentReply(rawMessage: string, context: AgentContext): AgentDecision {
  const message = sanitizePlainText(rawMessage, 500).toLowerCase();

  if (message.includes('solde') || message.includes('balance') || message.includes('htg')) {
    return {
      actionType: 'balance_lookup',
      replyContent: `Votre solde actuel est de ${Math.max(0, context.balance).toFixed(2)} HTG et ${Math.max(0, context.jetonsCp)} CP.`,
    };
  }

  if (message.includes('xp') || message.includes('niveau') || message.includes('level')) {
    return {
      actionType: 'xp_lookup',
      replyContent: `Votre progression actuelle est de ${Math.max(0, context.xp)} XP. Continuez les defis pour monter plus vite.`,
    };
  }

  if (message.includes('depot') || message.includes('moncash') || message.includes('recharger')) {
    return {
      actionType: 'deposit_redirect',
      replyContent: buildActionPayload({
        type: 'action',
        text: 'Vous pouvez lancer un depot securise depuis la zone finance.',
        actionLabel: 'Ouvrir Finance',
        actionUrl: '/client/finance',
      }),
    };
  }

  if (message.includes('retrait') || message.includes('retire') || message.includes('withdraw')) {
    return {
      actionType: 'withdraw_redirect',
      replyContent: buildActionPayload({
        type: 'action',
        text: 'Votre retrait doit etre initie depuis le module recompenses.',
        actionLabel: 'Demander un retrait',
        actionUrl: '/client/rewards',
      }),
    };
  }

  if (message.includes('defi') || message.includes('challenge') || message.includes('mission')) {
    const text =
      context.activeChallenges > 0
        ? `Vous avez ${context.activeChallenges} defi(s) actif(s).`
        : 'Aucun defi actif pour le moment.';

    return {
      actionType: 'challenge_status',
      replyContent: buildActionPayload({
        type: 'action',
        text,
        actionLabel: 'Voir les defis',
        actionUrl: '/client/challenges',
      }),
    };
  }

  if (context.role && context.role !== 'client') {
    return {
      actionType: 'role_restricted',
      replyContent: 'Cette assistance automatique est reservee aux comptes clients.',
    };
  }

  return {
    actionType: 'fallback',
    replyContent:
      'Merci pour votre message. Je peux vous aider pour solde, retraits, depots, progression XP et defis actifs. Un agent humain peut aussi prendre le relai.',
  };
}
