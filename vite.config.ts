import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    headers: {
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.sumup.com; img-src 'self' data:; frame-ancestors 'none';"
    },
    proxy: {
      // En dev local, redirige /api vers les functions Vercel via "vercel dev"
      // ou directement si tu utilises un serveur local séparé
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});