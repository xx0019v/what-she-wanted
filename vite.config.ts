import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { execSync } from 'node:child_process';

const https = process.env.HTTPS === '1';

// Build identity for cache-busting / "am I on the latest build?" checks.
let sha = 'local';
try {
  sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'local';
} catch {
  /* not a git repo */
}
const BUILD_ID = `${sha}.${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;

export default defineConfig({
  // Relative base → works on GitHub Pages subpaths (/repo/) AND Netlify/Vercel root.
  base: './',
  plugins: [react(), ...(https ? [basicSsl()] : [])],
  server: { host: true, https },
  preview: { host: true, https },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
