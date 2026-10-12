/**
 * FC CAREER — Layout de la zone protégée.
 * Les pages filles (dashboard, create-player…) passent par le garde de
 * session. L'écran du code est dans `./pin/` et n'est PAS protégé.
 *
 * GameProviders enveloppe toute la zone : état global (GameContext),
 * contexte joueur et UI (toasts/modales) accessibles aux pages filles.
 */

import FcCareerGuard from "./components/FcCareerGuard";
import GameProviders from "./providers/GameProviders";

export default function FcCareerLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameProviders>
      <FcCareerGuard>{children}</FcCareerGuard>
    </GameProviders>
  );
}
