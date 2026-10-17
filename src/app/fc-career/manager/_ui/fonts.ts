import { Great_Vibes, Hubot_Sans, Mona_Sans } from "next/font/google";

/** Titres condensés (Hubot Sans) et texte (Mona Sans), polices variables auto-hébergées par Next. */
export const hubot = Hubot_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-hubot", axes: ["wdth"], display: "swap" });
export const mona = Mona_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-mona", axes: ["wdth"], display: "swap" });
export const fontVars = `${hubot.variable} ${mona.variable}`;

/** Écriture manuscrite de la signature des contrats (Carrière Joueur). */
export const script = Great_Vibes({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-script", display: "swap" });
