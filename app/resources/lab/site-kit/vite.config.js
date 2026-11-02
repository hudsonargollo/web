import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Lab project Vite config. Host preview spawns Vite with --host/--port/--strictPort;
 * keep loopback defaults so accidental binds never leave 127.0.0.1.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    strictPort: true,
    // HMR stays on the Vite origin (iframe src = http://127.0.0.1:{port}/).
  },
})
