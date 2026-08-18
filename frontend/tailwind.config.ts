import { type Config } from "tailwindcss";

export const content: Config["content"] = [
  "./index.html",
  "./src/**/*.{ts,tsx,js,jsx}",
];

export const theme: Config["theme"] = {
  extend: {
    colors: {
      primary: "rgb(var(--primary) / <alpha-value>)",
      "primary-hover": "rgb(var(--primary-hover) / <alpha-value>)",
      "primary-light": "rgb(var(--primary-light) / <alpha-value>)",
      background: "rgb(var(--background) / <alpha-value>)",
      foreground: "rgb(var(--foreground) / <alpha-value>)",
      card: "rgb(var(--card) / <alpha-value>)",
      "card-foreground": "rgb(var(--card-foreground) / <alpha-value>)",
      popover: "rgb(var(--popover) / <alpha-value>)",
      "popover-foreground": "rgb(var(--popover-foreground) / <alpha-value>)",
      "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
      secondary: "rgb(var(--secondary) / <alpha-value>)",
      "secondary-foreground":
        "rgb(var(--secondary-foreground) / <alpha-value>)",
      muted: "rgb(var(--muted) / <alpha-value>)",
      "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
      accent: "rgb(var(--accent) / <alpha-value>)",
      "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",
      destructive: "rgb(var(--destructive) / <alpha-value>)",
      border: "rgb(var(--border) / <alpha-value>)",
      input: "rgb(var(--input) / <alpha-value>)",
      ring: "rgb(var(--ring) / <alpha-value>)",
      danger: "rgb(var(--danger) / <alpha-value>)",
      success: "rgb(var(--success) / <alpha-value>)",
      warning: "rgb(var(--warning) / <alpha-value>)",
    },
    borderRadius: {
      sm: "var(--radius-sm)",
      md: "var(--radius-md)",
      lg: "var(--radius-lg)",
      xl: "var(--radius-xl)",
      "2xl": "var(--radius-2xl)",
      "3xl": "var(--radius-3xl)",
      "4xl": "var(--radius-4xl)",
    },
  },
};

export const plugins: Config["plugins"] = [];
export const darkMode: Config["darkMode"] = "class";
