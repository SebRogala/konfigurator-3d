import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Set by docker-compose: behind Traefik the browser reaches the dev server on
// 443 over TLS, so the HMR client must connect there instead of 5173.
// Unset (plain `npm run dev`), Vite's defaults apply.
const hmrClientPort = process.env.VITE_HMR_CLIENT_PORT

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['konfigurator.dev.localhost'],
    hmr: hmrClientPort ? { clientPort: Number(hmrClientPort), protocol: 'wss' } : undefined,
  },
})
