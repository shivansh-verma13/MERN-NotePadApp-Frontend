import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Expose only this existing public setting, never the process environment.
  const { REACT_APP_API_URL = "" } = loadEnv(mode, process.cwd(), "REACT_APP_API_URL");
  return {
    plugins: [react()],
    // No automatic VITE_* exposure; the exact public override below is sufficient.
    envPrefix: [],
    define: {
      "process.env.REACT_APP_API_URL": JSON.stringify(REACT_APP_API_URL),
      "process.env.PUBLIC_URL": JSON.stringify(""),
    },
    build: { outDir: "build" },
    server: { host: "127.0.0.1", port: 3000, strictPort: true },
    preview: { host: "127.0.0.1", port: 3000, strictPort: true },
  };
});
