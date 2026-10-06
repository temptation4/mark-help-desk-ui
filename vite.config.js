import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  server: {
    // The browser only talks to this dev server (one origin, so no CORS config is needed), which forwards each call to the
    // right microservice: register and login go to the auth-service, everything else to the help-desk backend.
    // (The auth rule must come first: /api/v1/auth is also a prefix match for /api.)
    proxy: {
      '/api/v1/auth': {
        // override with AUTH_URL=http://localhost:8097 npm run dev to point at another auth-service
        target: process.env.AUTH_URL || 'http://localhost:8090',
        changeOrigin: true,
      },
      '/api': {
        // override with BACKEND_URL=http://localhost:8096 npm run dev to point at another backend
        target: process.env.BACKEND_URL || 'http://localhost:8089',
        changeOrigin: true,
      },
    },
  },
})