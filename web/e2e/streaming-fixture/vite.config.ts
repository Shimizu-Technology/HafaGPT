import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';

// Isolated test entry. No aliases or fixture routes are added to the app build.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@clerk/clerk-react': fileURLToPath(new URL('./clerk.ts', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
});
