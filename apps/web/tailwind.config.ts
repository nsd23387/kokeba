import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#222B6D",
        gold: "#C9A227",
        golddark: "#9A7D1E",
        cream: "#FBF7EC",
        page: "#FFFDF7",
        sage: "#A7B59A",
        line: "#E4E0D2",
        muted: "#6B6F86",
      },
      fontFamily: {
        story: ["Lora", "Georgia", "serif"],
        fidel: ["'Noto Sans Ethiopic'", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
