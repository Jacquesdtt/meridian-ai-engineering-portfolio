import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      /** Teaching snapshot: bundle main-repo ADRs at build time (SoT remains Docs/Architecture/ADRs/). */
      '@meridian-adrs': path.resolve(__dirname, '../Docs/Architecture/ADRs'),
    },
  },
  server: {
    port: 3000,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
});
