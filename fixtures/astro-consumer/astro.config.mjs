import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  output: "static",
  vite: {
    cacheDir: fileURLToPath(
      new URL("../../node_modules/.vite-astro", import.meta.url),
    ),
  },
});
