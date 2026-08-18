import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "@reduxjs/toolkit", "react-redux"],
          ui: ["lucide-react", "clsx", "tailwind-merge", "sonner"],
          charts: ["recharts"],
          tables: ["@tanstack/react-table"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          data: ["@tanstack/react-query", "axios"],
        },
      },
    },
  },
});
