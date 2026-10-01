import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Isolated test entry. No aliases or fixture routes are added to the app build.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@clerk/clerk-react': new URL('./clerk.ts', import.meta.url).pathname },
  },
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
});
