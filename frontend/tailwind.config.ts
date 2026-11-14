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
        obsidian: {
          950: "#04080D",
          900: "#080E15",
          850: "#0C141F",
          800: "#101B29",
        },
        aero: {
          navy: "#0C1A2B",
          slate: "#1E293B",
          teal: "#086F83",
          tealLight: "#ECFEFF",
          brass: "#B45309",
          brassLight: "#FEF3C7",
          brassBorder: "#FCD34D",
          emerald: "#047857",
          emeraldLight: "#ECFDF5",
          canvas: "#F4F6F9",
          card: "#FFFFFF",
          border: "#E2E8F0",
        },
        jfll: {
          navy: "#080E15",
          blue: "#086F83",
          accent: "#B45309",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["'JetBrains Mono'", "var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(8, 14, 21, 0.03)",
        xs: "0 1px 2px 0 rgba(8, 14, 21, 0.05)",
        card: "0 1px 3px 0 rgba(8, 14, 21, 0.05), 0 1px 2px -1px rgba(8, 14, 21, 0.03)",
        elevated: "0 10px 25px -5px rgba(8, 14, 21, 0.08), 0 8px 10px -6px rgba(8, 14, 21, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
