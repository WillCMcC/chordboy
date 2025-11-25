import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
    port: 3000,
  },
});
