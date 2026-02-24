import Link from "next/link";
export default function PariLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", color: "white" }}>
      
      {/* Sidebar */}
      <aside
        style={{
          width: 250,
          padding: 20,
          borderRight: "1px solid #1e293b",
          background: "#0b1220",
        }}
      >
        <h2 style={{ marginBottom: 30 }}>🎯 Betting Engine</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 15 }}>
  <Link href="/pari">Dashboard</Link>
  <Link href="/pari/analyse">Analyse</Link>
  <Link href="/pari/psychologie">Psychologie</Link>
  <Link href="/pari/create-ticket">Créer Ticket</Link>
  <Link href="/pari/historique">Historique</Link>
</nav>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: 40 }}>{children}</main>
    </div>
  );
}
