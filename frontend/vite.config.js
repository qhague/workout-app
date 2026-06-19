import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login':       'http://127.0.0.1:5000',
      '/register':    'http://127.0.0.1:5000',
      '/sync_data':   'http://127.0.0.1:5000',
      '/export_data': 'http://127.0.0.1:5000',
    }
  },
  build: {
    outDir: 'dist',
  }
})
