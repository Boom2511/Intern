import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        "progress-indeterminate": {
          "0%": { transform: "translateX(-100%)", width: "30%" },
          "50%": { transform: "translateX(150%)", width: "60%" },
          "100%": { transform: "translateX(-100%)", width: "30%" },
        },
      },
      animation: {
        "progress-indeterminate": "progress-indeterminate 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
