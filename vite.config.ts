import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/develop-health-concept/",
  plugins: [react(), tailwindcss()],
  test: { environment: "node" },
});
