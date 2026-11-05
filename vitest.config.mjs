import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.mjs";

export default defineConfig(context => mergeConfig(viteConfig(context), {
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["./src/test/setup.js"],
    clearMocks: true,
  },
}));
