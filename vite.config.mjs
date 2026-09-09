import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 8080
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [
      "ninkosports.com",
      "www.ninkosports.com",
      "allball-frontend-production.up.railway.app",
      "ninkosports-ai.up.railway.app"
    ]
  }
});
