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
          <a href="/pari">Dashboard</a>
          <a href="/pari/analyse">Analyse</a>
          <a href="/pari/psychologie">Psychologie</a>
          <a href="/pari/create-ticket">Créer Ticket</a>
          <a href="/pari/historique">Historique</a>
        </nav>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: 40 }}>{children}</main>
    </div>
  );
}
