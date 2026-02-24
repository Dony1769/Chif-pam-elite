import Link from "next/link";
export default function PariDashboard() {
  return (
    <div>
      <h1>Admin - Système de Paris</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
          marginTop: 30,
        }}
      >
        <Card title="Analyse" link="/pari/analyse" />
        <Card title="Psychologie" link="/pari/psychologie" />
        <Card title="Créer Ticket" link="/pari/create-ticket" />
        <Card title="Historique" link="/pari/historique" />
      </div>
    </div>
  );
}


function Card({ title, link }: { title: string; link: string }) {
  return (
    <Link
      href={link}
      style={{
        padding: 20,
        background: "#1e293b",
        borderRadius: 10,
        textDecoration: "none",
        color: "white",
        display: "block",
      }}
    >
      <h3>{title}</h3>
    </Link>
  );
}
