import path from "node:path";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Painel 100% client-side (Firebase Auth + Firestore): build em modo SPA,
// publicado como site estatico no Firebase Hosting (dist/client).
export default defineConfig({
  server: { port: 8080, strictPort: true },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  plugins: [
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
    tailwindcss(),
  ],
});


