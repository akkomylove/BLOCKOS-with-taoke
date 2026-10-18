import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "var(--color-brand)",
          hover: "var(--color-brand-hover)",
          active: "var(--color-brand-active)",
          light: "var(--color-brand-light)",
          "light-hover": "var(--color-brand-light-hover)",
        },
        surface: {
          DEFAULT: "var(--color-bg-surface)",
          subtle: "var(--color-bg-subtle)",
          hover: "var(--color-bg-hover)",
        },
        page: {
          DEFAULT: "var(--color-bg-page)",
        },
        content: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          disabled: "var(--color-text-disabled)",
        },
        line: {
          border: "var(--color-border)",
          "border-hover": "var(--color-border-hover)",
          divider: "var(--color-divider)",
        },
        ai: {
          purple: "var(--color-ai-purple)",
          "purple-light": "var(--color-ai-purple-light)",
          "purple-border": "var(--color-ai-purple-border)",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        popover: "var(--shadow-popover)",
        modal: "var(--shadow-modal)",
      },
      borderRadius: {
        control: "7px",
        card: "12px",
        modal: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
