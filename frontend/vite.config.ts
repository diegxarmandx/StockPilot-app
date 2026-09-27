import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(() => {
  if (process.env.VERCEL === '1') {
    const value = process.env.VITE_API_BASE_URL
    if (!value) throw new Error('Set VITE_API_BASE_URL in the frontend Vercel project.')
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error(
        'VITE_API_BASE_URL must be a public HTTPS origin without credentials or a path.',
      )
  }
  return {
    plugins: [react(), tailwindcss()],
    envDir: process.env.VERCEL === '1' ? '.' : '..',
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
  }
})
