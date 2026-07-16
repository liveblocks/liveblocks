import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3010,
    proxy: {
      "/ws": {
        target: "ws://127.0.0.1:3011",
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ["@liveblocks/storage", "@liveblocks/core"],
  },
});
