import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': __dirname,
    },
  },
  server: {
    host: true
  },
  define: {
    // Alguns pacotes dependem de process.env, isso evita que o build quebre
    'process.env': {}
  },
  build: {
    // Aumenta o limite de aviso de tamanho de chunk para evitar warnings desnecessários
    chunkSizeWarningLimit: 1000
  }
});
