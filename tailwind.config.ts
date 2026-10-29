import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], serif: ["var(--font-serif)", "Georgia", "serif"] },
      colors: {
        paper: "#FAFAF7", ink: "#17181A", muted: "#6B6B66", line: "#E4E3DD",
        accent: { DEFAULT: "#1F4D3A", soft: "#EEF3EF" }, warn: "#9A5B13", bad: "#9B2C2C",
      },
    },
  },
  plugins: [],
};
export default config;
