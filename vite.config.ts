import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base: "./" keeps the build portable for GitHub Pages / any static host.
export default defineConfig({
  base: "/EL-TAMAYOZ/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist", sourcemap: false },
});
