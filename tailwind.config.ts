import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // MixLabs dark cinematic palette
        bg: {
          base: "#0A0A0A",
          surface: "#111111",
          elevated: "#1A1A1A",
          overlay: "#222222",
        },
        border: {
          subtle: "#1F1F1F",
          DEFAULT: "#2A2A2A",
          strong: "#3A3A3A",
        },
        text: {
          primary: "#F0F0F0",
          secondary: "#888888",
          muted: "#555555",
        },
        accent: {
          DEFAULT: "#E8E8E8",
          dim: "#666666",
        },
        status: {
          active: "#22C55E",
          review: "#F59E0B",
          ready: "#3B82F6",
          paused: "#6B7280",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
