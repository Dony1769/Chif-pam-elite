/**
 * Service de Bot de support automatique pour Chif-Pam
 * Fichier : src/services/chatBot.ts
 */

export interface PresetResponse {
  id: string;
  title: string;
  keywords: string[];
  messageText: string;
  actionLabel: string;
  actionUrl: string;
}

// Modèles de réponses préconçues pour l'Admin et le Bot
export const PRESET_RESPONSES: PresetResponse[] = [
  {
    id: 'depot',
    title: 'Faire un Dépôt / Recharger',
    keywords: ['depot', 'depo', 'recharger', 'moncash', 'natcash', 'kob', 'lajan', 'recharge'],
    messageText: 'Pou fè yon depozit sou kont ou (MonCash / NatCash), ale sou paj Recharger a epi swiv enstriksyon yo.',
    actionLabel: 'Recharger mon compte',
    actionUrl: '/client/market',
  },
  {
    id: 'retrait',
    title: 'Demander un Retrait',
    keywords: ['retrait', 'retrè', 'retire', 'vireman', 'tirer', 'cashout'],
    messageText: 'Pou mande yon retrè sou MonCash ou NatCash, ale sou paj demand yo epi antre montan an.',
    actionLabel: 'Demander un retrait',
    actionUrl: '/client/rewards',
  },
  {
    id: 'profil',
    title: 'Modifier le Profil / Mot de passe',
    keywords: ['profil', 'profile', 'modifye', 'pwofil', 'mot de passe', 'modpas', 'kod', 'sekirite'],
    messageText: 'Ou ka modifye enfòmasyon pèsonèl ou ak kòd sekirite ou sou paj Profil la.',
    actionLabel: 'Mon Profil',
    actionUrl: '/client/profile',
  },
  {
    id: 'guide',
    title: 'Guide & Aide sur les jeux',
    keywords: ['aide', 'ed', 'èd', 'edmi', 'regle', 'jwe', 'kijan', 'comment', 'help', 'règles'],
    messageText: 'Tout règ jwèt yo ak kesyon ou ka genyen yo eksplike byen fasil nan Centre d\'Aide la.',
    actionLabel: 'Consulter le Guide',
    actionUrl: '/client/help',
  },
];

export class ChatBotService {
  /**
   * Analyse le message du client et retourne une réponse automatique si un mot-clé match
   */
  static generateAutoReply(userMessage: string): { content: string } {
    const textLower = userMessage.toLowerCase();

    for (const preset of PRESET_RESPONSES) {
      const match = preset.keywords.some((kw) => textLower.includes(kw));
      if (match) {
        return {
          content: JSON.stringify({
            type: 'action',
            text: preset.messageText,
            actionLabel: preset.actionLabel,
            actionUrl: preset.actionUrl,
          }),
        };
      }
    }

    // Message d'attente par défaut si aucun mot-clé ne match
    return {
      content: JSON.stringify({
        type: 'text',
        text: '🤖 [Bot Chif-Pam] : Mèsi pou mesaj ou a ! Yon administratè ap reponn ou nan yon ti moman. / Merci ! Un administrateur va vous répondre sous peu.',
      }),
    };
  }
}
