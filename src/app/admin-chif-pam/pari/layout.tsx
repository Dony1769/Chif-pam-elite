"use client"; // ⚡ IMPORTANT : active le mode client

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function PariLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // ✅ fonctionne maintenant

  // Pour styliser le lien actif
  const linkStyle = (href: string) => ({
    color: pathname === href ? "#10b981" : "white",
    textDecoration: "none",
    padding: "5px 10px",
    borderRadius: 5,
    background: pathname === href ? "#1e293b" : "transparent",
    display: "block",
  });

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

        <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link href="/pari" style={linkStyle("/pari")}>Dashboard</Link>
          <Link href="/pari/analyse" style={linkStyle("/pari/analyse")}>Analyse</Link>
          <Link href="/pari/psychologie" style={linkStyle("/pari/psychologie")}>Psychologie</Link>
          <Link href="/pari/create-ticket" style={linkStyle("/pari/create-ticket")}>Créer Ticket</Link>
          <Link href="/pari/historique" style={linkStyle("/pari/historique")}>Historique</Link>
        </nav>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, padding: 40 }}>{children}</main>
    </div>
  );
}
