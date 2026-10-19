import { ImageResponse } from "next/og";

export const alt = "FC Career 27 : jeu de carrière de football gratuit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #0A1430 0%, #16234A 60%, #1F3BC2 100%)", color: "#EDF1FF", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: "#F6BF45", letterSpacing: 3 }}>FC CAREER 27</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 900, lineHeight: 1 }}>Ta carrière de footballeur commence ici.</div>
          <div style={{ display: "flex", fontSize: 32, color: "#A6B3DA" }}>Carrière Joueur et Manager · matchs en direct · mercato · Euro et Coupe du monde</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26, fontWeight: 700 }}>
          <div style={{ padding: "10px 22px", borderRadius: 999, background: "#3D86FF", color: "#fff" }}>Gratuit</div>
          <div style={{ padding: "10px 22px", borderRadius: 999, background: "rgba(246,191,69,.2)", color: "#F6BF45" }}>Dans le navigateur</div>
        </div>
      </div>
    ),
    size,
  );
}
