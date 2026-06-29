import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#090b12",
        panel: "#111522",
        line: "#262c3d",
        kakao: "#fee500",
        clue: "#82f3ff"
      },
      boxShadow: {
        glow: "0 0 40px rgba(130, 243, 255, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
