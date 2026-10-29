import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "BACKEND_");
  return {
    plugins: [react(), ...(mode === "mobile" ? [basicSsl()] : [])],
    server: {
      host: true,
      port: 5173,
      allowedHosts: [".trycloudflare.com"],
      proxy: {
        "/api": {
          target: env.BACKEND_ORIGIN ?? "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
