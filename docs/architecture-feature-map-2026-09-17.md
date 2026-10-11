# Rapport d'architecture et cartographie fonctionnelle

Date d'analyse : 17 septembre 2026  
Périmètre : `src/app`, composants partagés, services/actions et accès Supabase observables dans le dépôt.

## 0. Vue d'ensemble

Chif-Pam est une application web Next.js en français, structurée autour de trois expériences authentifiées :

| Espace | Entrée principale | Finalité |
|---|---|---|
| Client | `/client/home` | Utiliser les jeux, récompenses, portefeuille, marché et services communautaires. |
| Agent | `/agent/dashboard` | Acheter du stock CP, publier une offre P2P, suivre ses ventes/rachats et gérer ses fonds. |
| Administrateur | `/admin-chif-pam/dashboard` | Piloter les utilisateurs, finances, jeux, récompenses, marché P2P, support et sécurité. |

### Architecture applicative observée

- **Présentation** : routes Next.js App Router, layouts par portail et composants React client.
- **Design system partiel** : `components/ui/primitives.tsx` est utilisé surtout par le portail agent; les autres écrans combinent Tailwind, composants locaux et styles inline.
- **Données et authentification** : Supabase Auth, tables PostgreSQL, RPC métier, Storage pour les preuves de paiement et Supabase Realtime.
- **Services métier** : services séparés pour chat, finance, jeux, missions, valeur et opérations admin; certaines pages appellent encore Supabase directement.
- **Expérience visuelle** : interface sombre, accents emerald/cyan/amber, cartes arrondies, feedback toast/modal, animations Framer Motion et quelques surfaces Three.js.
- **PWA et observabilité** : manifeste/service worker, installation PWA, Web Vitals, Vercel Speed Insights, sons UI et surface 3D d'ambiance.

### Contrôle d'accès

- `/client/*` exige une session, bloque les comptes bannis, impose la vérification email et redirige les rôles admin/agent vers leur portail.
- `/admin-chif-pam/*` vérifie explicitement le rôle `admin` avant d'afficher le shell.
- `/agent/*` vérifie la présence d'une session, mais le layout observé ne vérifie pas explicitement `profile.role === 'agent'`. Les RPC et données métier restent les contrôles effectifs à confirmer.
- La page racine `/` rend directement l'accueil client dans `ClientAppShell`.

## 1. Portail client

### Pages et routes

| Route | Vue / fonction observée |
|---|---|
| `/client/home` | Tableau d'accueil : profil, statut VIP, ressources, accès rapides, missions, offres et menu mobile. |
| `/client/rewards` | Calendrier mensuel de récompenses; réclamation quotidienne CP/diamants/XP, progression de niveau et compte à rebours. |
| `/client/challenges` | Arène de défis actifs avec droit d'entrée, cagnotte, type de jeu, participation et compte à rebours; remise VIP sur les frais. |
| `/client/market` | Boutique de packs CP achetables avec diamants ou selon le flux HTG exposé par la page; solde, prix, bonus et feedback transactionnel. |
| `/client/p2p` | Marché interne : sélection d'une offre agent, calcul du coût HTG, contrôle du volume et achat de CP via RPC. |
| `/client/finance` | Dépôt et retrait HTG; méthodes NatCash/MonCash, preuve de paiement, numéro de réception, validation et synchronisation du solde. |
| `/client/history` | Historique des dépôts/retraits avec statuts pending/approved/rejected et mises à jour temps réel. |
| `/client/notifications` | Centre de notifications utilisateur. |
| `/client/chat` | Support Chif-Pam temps réel, messages texte/images, pièces jointes, messages admin et réponse bot via `/api/chat/agent`. |
| `/client/profile` | Profil, solde et statistiques, graphique d'activité, coupon, mot de passe/pseudo, avatar et Game Pass, notifications push/PWA, demande de statut agent. |
| `/client/vip` | Souscription hebdomadaire/mensuelle, bénéfices VIP, confirmation, annulation/expiration et FAQ. |
| `/client/rank` | Classement des utilisateurs. |
| `/client/reports` | Vue de rapports utilisateur; détail fonctionnel à confirmer dans la page. |
| `/client/help` | Aide utilisateur; détail fonctionnel à confirmer dans la page. |
| `/client/play` | Surface de lancement ou sélection de jeux; détail du flux à confirmer. |
| `/client/list` | Liste/sélection liée aux jeux; détail du flux à confirmer. |
| `/client/uno` | Jeu UNO multijoueur. |
| `/client/mines` | Mini-jeu Mines avec mise et gain/perte. |
| `/client/crash` | Mini-jeu Crash avec multiplicateur et cash-out probable; le suivi admin confirme une table de jeu dédiée. |
| `/client/plinko` | Mini-jeu Plinko. |
| `/client/quiz` | Mini-jeu Quiz. |
| `/client/biometric-hack` | Mini-jeu Biometric Hack. |
| `/client/laser-vault` | Mini-jeu Laser Vault. |
| `/client/squidglass` | Mini-jeu Squid Glass. |
| `/client/hell-elevator` | Mini-jeu Hell Elevator. |

### Services et fonctionnalités client

- **Économie** : CP (`jetons_cp`), HTG (`balance`), diamants, XP, niveaux, badges/titres et progression.
- **Récompenses** : calendrier quotidien, missions et progression; le RPC `claim_calendar_reward` centralise la réclamation et le level-up.
- **Jeux** : plusieurs expériences à mise, gains et statuts; la configuration admin permet d'activer ou suspendre les jeux.
- **Défis** : participation à des compétitions limitées dans le temps avec cagnotte et frais d'entrée modulés par VIP.
- **Finance** : dépôt avec preuve image jusqu'à 5 Mo, retrait vers numéro mobile, seuils observés de 25 HTG et 100 HTG, puis traitement administratif.
- **Marché** : achat de packs en boutique et achat P2P de CP auprès d'un agent; le prix P2P est calculé par l'offre et validé côté Supabase.
- **Communauté et assistance** : chat temps réel, notifications, messages push et accès Live via la navigation partagée.
- **Conversion en agent** : demande soumise depuis le profil, avec avertissement explicite de remise à zéro des soldes HTG/CP lors du passage agent.

### Composants clés et lecture UX

- Navigation `ClientAppShell` : menu latéral desktop et barre compacte mobile avec Accueil, Récompenses, Défis, Offres, Live, Profil et VIP.
- Accueil riche en raccourcis, compteurs et feedback inline; le menu mobile reprend les parcours essentiels.
- Cartes et panneaux de ressources pour rendre les soldes et la progression immédiatement lisibles.
- Motion/animations pour l'entrée des sections, les récompenses et les confirmations; Three.js est utilisé notamment dans l'expérience récompenses et VIP.
- Feedback transversal via `AppFeedbackProvider`, toasts, modales de confirmation et loaders.
- Chat avec liste virtualisable, images, fichiers, indicateur de frappe et bulle de messages non lus dans le shell.

## 2. Portail agent

### Pages et routes

| Route | Vue / fonction observée |
|---|---|
| `/agent/dashboard` | KPIs CP/HTG, réputation, clients uniques, volume P2P, prix de gros et achat de stock CP avec confirmation. |
| `/agent/offer` | Gestion de l'offre agent P2P; formulaire et paramètres de vente à documenter davantage dans le code de la page. |
| `/agent/history` | Historique paginé des ventes et rachats CP, taux HTG/CP et chargement progressif. |
| `/agent/finance` | Dépôts/retraits, preuve de paiement, portefeuille disponible/verrouillé, historique financier et synchronisation temps réel. |

### Rôles et services

- **Fourniture de liquidité** : l'agent achète du stock CP au prix de gros via `agent_buy_wholesale`.
- **Marché P2P** : l'agent configure une offre avec taux, limites et disponibilité; les clients achètent via `p2p_buy_cp`.
- **Réputation** : niveau, nombre de clients uniques et réduction calculée sur le prix de gros.
- **Suivi opérationnel** : ventes/rachats, montants CP, montants HTG et taux appliqués.
- **Finance** : mêmes flux de dépôt/retrait que le client, avec portefeuille disponible et fonds verrouillés.

### Outils et interface quotidienne

- Shell agent autonome avec navigation horizontale : Dashboard, Offre, Historique, Finance, Déconnexion.
- Design system `DSPage`, `DSCard`, `DSButton`, `DSInput`, `DSModal`, badges et loaders, plus animations d'apparition.
- Dashboard orienté décision : cinq KPI, progression de réputation, calcul du coût d'achat et modal de confirmation.
- Historique paginé pour éviter une liste non bornée.
- Finance organisée en contrôle segmenté dépôt/retrait, formulaire contextualisé et journal des opérations.

## 3. Portail administrateur

### Pages et routes

| Route | Vue / fonction observée |
|---|---|
| `/admin-chif-pam/dashboard` | Centre de contrôle avec KPIs, données live, alertes actionnables et raccourcis vers les modules. |
| `/admin-chif-pam/analytics` | Analytics utilisateurs, solde global, flux 7 jours, jeux actifs, volume/profit par jeu et métriques récompenses. |
| `/admin-chif-pam/users` | Recherche, blocage/réactivation, motif de ban, reset de mot de passe et ajustement du solde HTG. |
| `/admin-chif-pam/demandes` | File financière filtrable : dépôts/retraits pending, approved, rejected ou tous; approbation/refus avec note. |
| `/admin-chif-pam/p2p` | Politique P2P (bornes de taux, prix de gros, plancher, plafond transaction), statut des agents et flags de fraude. |
| `/admin-chif-pam/agent-requests` | Approbation/refus des demandes de passage agent avec motif optionnel. |
| `/admin-chif-pam/market` | Création, activation/désactivation et suppression des packs boutique CP. |
| `/admin-chif-pam/mini-jeux` | Volume, profit, nombre de parties et activation/maintenance de chaque mini-jeu. |
| `/admin-chif-pam/loterie` | Ouverture manuelle d'un tirage, multiplicateur, suivi des mises, clôture et paiement. |
| `/admin-chif-pam/challenges` | Création, filtrage, clôture automatique des défis expirés, clôture manuelle et suppression. |
| `/admin-chif-pam/coupon` | Création de coupons HTG et activation/désactivation. |
| `/admin-chif-pam/chat` | Support administrateur et traitement des conversations client. |
| `/admin-chif-pam/notifications` | Diffusion d'un message à tous les utilisateurs après confirmation. |
| `/admin-chif-pam/phone-duplicates` | Groupement des doublons par numéro normalisé, recherche, données de compte et revue manuelle. |
| `/admin-chif-pam/phone-issues` | Incidents de téléphone ouverts, résolution manuelle et journal des fusions bloquées. |

### Gestion et contrôle

- **Contrôle financier** : validation atomique via RPC, notes admin, filtres par statut, recherche par pseudo/téléphone et temps réel.
- **Gouvernance utilisateurs** : suspension, réactivation, reset de mot de passe et correction de solde; l'admin ne peut pas agir sur son propre compte via l'action serveur observée.
- **Économie** : paramètres de boutique, coupons, récompenses visibles dans les analytics, jeux, loterie et politique P2P.
- **Marché et agents** : politique globale, réputation, taux et suspension d'agents; traitement séparé des demandes de conversion agent.
- **Modération et sécurité** : flags de fraude P2P, doublons téléphoniques, incidents de normalisation et support centralisé.

### Alertes, rapports et KPIs

Le dashboard met en avant : dépôts en attente, retraits en attente, messages non lus, demandes agent et flags de fraude P2P. Les analytics ajoutent : nombre d'utilisateurs, solde total, volume et net sur sept jours, jeux actifs, volume/profit/parties par jeu, configurations de récompenses, claims et missions.

L'interface utilise un bandeau d'alerte qui dirige vers la première file prioritaire, un bouton de rafraîchissement et des abonnements Realtime sur plusieurs tables. Les indicateurs doivent toutefois être interprétés avec prudence : certaines métriques sont calculées côté page à partir des tables de jeu et non d'un entrepôt analytique dédié.

## 4. Vues publiques et communes

| Route | Rôle |
|---|---|
| `/` | Landing/accueil effectif : rend directement `ClientHome` dans le shell client, donc l'expérience publique et l'accueil authentifié ne sont pas totalement séparés. |
| `/connexion` | Authentification et entrée dans l'application; redirection vers le portail selon le rôle. |
| `/inscription` | Création de compte. La vérification email est ensuite imposée dans le layout client. |
| `/live` | Vue Live accessible depuis le shell client; détail du service à approfondir dans la page. |
| `/legal/mention-legales` | Mentions légales. |
| `/legal/confidentialite` | Politique de confidentialité. |
| `/legal/conditions` | Conditions d'utilisation. |

### Marché global

Il n'existe pas de page `src/app/market/page.tsx` dans l'arborescence observée. Le marché client est implémenté sous `/client/market`, le marché P2P sous `/client/p2p` et l'administration sous `/admin-chif-pam/market` et `/admin-chif-pam/p2p`. Toute documentation UX parlant de `/market` doit donc être alignée avec cette réalité ou prévoir une route d'alias explicite.

## 5. Synthèse UX et axes de révision

### Forces observées

- Parcours métier clairement séparés pour client, agent et admin.
- Forte visibilité des soldes, statuts, niveaux, récompenses et actions urgentes.
- Feedback utilisateur systématique sur les opérations à risque : confirmation, toast, état de chargement et statut temps réel.
- Finance et P2P structurés autour de validations serveur/RPC plutôt que de simples mutations d'interface.
- L'univers visuel est cohérent : sombre, premium, ludique et orienté gamification.

### Points de cohérence à traiter

- Uniformiser la navigation : plusieurs pages client existent mais ne sont pas dans le menu principal, notamment finance, history, notifications, chat et les jeux.
- Séparer clairement landing publique et accueil privé, puisque `/` rend actuellement une page client.
- Ajouter ou documenter un contrôle de rôle agent au niveau du layout si l'accès session seule n'est pas intentionnel.
- Clarifier la nomenclature `market` / `marketplace` / `p2p` pour éviter de confondre boutique de packs et échange CP entre utilisateurs/agents.
- Réduire la divergence de design system entre agent (`DS*`) et client/admin (styles locaux) si une expérience homogène est recherchée.
- Vérifier les écrans marqués ici « détail à confirmer » (`reports`, `help`, `play`, `list`, `live`) avant de les inclure dans une promesse produit ou une navigation prioritaire.
- Formaliser les états métier visibles partout : pending, approved, rejected, expired, suspended, maintenance et reviewed.

### Conclusion

L'application est une plateforme gamifiée de portefeuille et de marché CP, avec une boucle client (jouer, gagner, réclamer, acheter), une boucle agent (approvisionner, vendre, suivre, financer) et une boucle admin (contrôler, configurer, auditer, modérer). La priorité UX la plus structurante est de rendre ces boucles plus lisibles par une taxonomie commune des marchés, des transactions et des récompenses, tout en maintenant la séparation des responsabilités et des contrôles d'accès.