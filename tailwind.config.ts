import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // Important pour le toggle de thème
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif'],
      },
      colors: {
        'neon-cyan': '#00f5ff',
        'neon-purple': '#bf00ff',
        'neon-pink': '#ff00d4',
        'neon-blue': '#0066ff',
        'dark-bg': '#0a0a0f',
        'dark-card': '#12121a',
        'dark-surface': '#1a1a24',
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.3), 0 0 40px rgba(191, 0, 255, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 245, 255, 0.5), 0 0 60px rgba(191, 0, 255, 0.4)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      }
    },
  },
  plugins: [],
};
export default config;
