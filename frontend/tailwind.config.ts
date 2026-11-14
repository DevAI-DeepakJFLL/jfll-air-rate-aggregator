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
        jfll: {
          blue: "#144272",
          navy: "#0A2647",
          teal: "#205295",
          accent: "#2C74B3",
          light: "#F5F7FA",
        },
      },
    },
  },
  plugins: [],
};
export default config;
