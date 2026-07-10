import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Event-Database-Management-System/',
  server: {
    port: 5173
  }
})