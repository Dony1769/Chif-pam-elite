import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PariLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Fonction pour mettre en surbrillance le lien actif
  const isActive = (path: string) => pathname === path;

  const links = [
    { label: "Dashboard", path: "/pari" },
    { label: "Analyse", path: "/pari/analyse" },
    { label: "Psychologie", path: "/pari/psychologie" },
    { label: "Créer Ticket", path: "/pari/create-ticket" },
    { label: "Historique", path: "/pari/historique" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", color: "white" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 250,
          padding: 20,
          borderRight: "1px solid #1e293b",
          background: "#0b1220",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 style={{ marginBottom: 30 }}>🎯 Betting Engine</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {links.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              style={{
                padding: "10px 15px",
                borderRadius: 8,
                textDecoration: "none",
                color: isActive(link.path) ? "#0f172a" : "white",
                background: isActive(link.path) ? "#38bdf8" : "transparent",
                transition: "all 0.2s ease",
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: 40 }}>{children}</main>
    </div>
  );
}
