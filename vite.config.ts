import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  define: {
    // Alguns pacotes dependem de process.env, isso evita que o build quebre
    'process.env': {}
  },
  build: {
    // Evita que erros de Typescript bloqueiem o build de produção no Vercel
    // typescript: { ignoreBuildErrors: true } - REMOVED: Invalid property in Vite build config
  }
});
