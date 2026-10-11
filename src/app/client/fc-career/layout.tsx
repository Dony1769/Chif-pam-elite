/**
 * FC CAREER — Layout de la zone protégée.
 * Les pages filles (dashboard, create-player…) passent par le garde de
 * session. L'écran du code est dans `./pin/` et n'est PAS protégé.
 */

import FcCareerGuard from "./components/FcCareerGuard";

export default function FcCareerLayout({ children }: { children: React.ReactNode }) {
  return <FcCareerGuard>{children}</FcCareerGuard>;
}
