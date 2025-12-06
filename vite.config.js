import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Generate build timestamp in Los Angeles Pacific time
const buildTime = new Date().toLocaleString("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});

export default defineConfig({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "ChordBoy",
        short_name: "ChordBoy",
        description: "MIDI Chord Controller for Jazz Performance",
        theme_color: "#ffffff",
        icons: [
          {
            src: "icon.svg",
            sizes: "192x192 512x512",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
  server: {
    port: 4000,
  },
});
