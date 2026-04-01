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
        brand: {
          bg: '#121826',
          sidebar: '#1E2336',
          panel: '#1E2336',
          tableBg: '#161B2A',
          primary: '#6366F1',
          primaryHover: '#4F46E5',
          text: '#E2E8F0',
          textMuted: '#94A3B8',
          border: '#334155',
          red: '#F87171',
          green: '#34D399',
        }
      }
    },
  },
  plugins: [],
};
export default config;
