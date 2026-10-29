import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // SF Pro on Apple devices, Inter everywhere else.
        sans: ["-apple-system", "BlinkMacSystemFont", '"SF Pro Text"', "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "#F5F5F7", ink: "#1D1D1F", muted: "#6E6E73", line: "#D2D2D7",
        accent: { DEFAULT: "#0B7A4B", dark: "#08623C", soft: "#E8F4EE" },
        warn: { DEFAULT: "#A35200", soft: "#FFF4E5" },
        bad: { DEFAULT: "#C4281C", soft: "#FDECEA" },
      },
    },
  },
  plugins: [],
};
export default config;
