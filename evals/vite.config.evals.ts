import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dedicated Vite config for running the eval suite's dev server. Identical
// to the app's real vite.config.ts except for `cacheDir`: the sandbox this
// runs in can't write/delete inside the project's own node_modules/.vite
// (writes succeed but deletes get EPERM), so this points the cache at a
// scratch directory instead. No app behavior differs — this only affects
// where Vite's dependency-optimization cache is stored.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: '/sessions/determined-dazzling-lamport/.vite-cache-evals',
});
