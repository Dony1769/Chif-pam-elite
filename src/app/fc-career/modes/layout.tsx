import { fontVars } from "../manager/_ui/fonts";
import "../manager/manager.css";
import "../manager/flat.css";

/** Même habillage « Tribune » que les modes Manager et Joueur. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={fontVars}>{children}</div>;
}
