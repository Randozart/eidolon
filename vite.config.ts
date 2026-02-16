import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  // Add this block to ensure WASM is served with the correct header
  server: {
    fs: {
      allow: ['..'] // Allows Vite to reach the WASM files in node_modules
    }
  },
  optimizeDeps: {
    exclude: ['emglken'] // Prevents Vite from trying to pre-bundle the WASM-heavy package
  }
});