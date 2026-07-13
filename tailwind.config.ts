import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        linred: "rgb(var(--color-accent) / <alpha-value>)",
        charcoal: "rgb(var(--color-text) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        smoke: "rgb(var(--color-smoke) / <alpha-value>)"
      },
      boxShadow: {
        lift: "0 18px 45px rgba(7, 7, 8, 0.14)",
        soft: "0 10px 30px rgba(7, 7, 8, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
