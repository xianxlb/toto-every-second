import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:3350',
        ws: true,
      },
      '/history': {
        target: 'http://localhost:3350',
      },
      '/wins': {
        target: 'http://localhost:3350',
      },
    },
  },
})
