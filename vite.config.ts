import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  cacheDir: "node_modules/.vite-editor",
  plugins: [react()],
  test: { include: ["src/**/*.test.ts"] },
});
