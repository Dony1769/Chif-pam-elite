import { ImageResponse } from "next/og";

export const alt = "ChifPam : jeux en ligne, défis et FC Career 27";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image de partage : les deux portes du site, ChifPam et FC Career 27. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(120deg, #06110f 0%, #071c21 50%, #08104A 100%)", color: "#EEF2FF", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 900, color: "#04120c" }}>C</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 900, letterSpacing: 1 }}>CHIF<span style={{ color: "#10B981" }}>PAM</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 900, lineHeight: 1.02 }}>Jouez. Échangez. Progressez.</div>
          <div style={{ display: "flex", fontSize: 32, color: "#A6B3DA" }}>Jeux en ligne, défis, marché P2P · et FC Career 27, le jeu de carrière de football</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26, fontWeight: 700 }}>
          <div style={{ padding: "10px 22px", borderRadius: 999, background: "rgba(16,185,129,.18)", color: "#6EE7B7" }}>chifpam.com</div>
          <div style={{ padding: "10px 22px", borderRadius: 999, background: "rgba(61,134,255,.2)", color: "#9DBBFF" }}>FC Career 27</div>
        </div>
      </div>
    ),
    size,
  );
}
