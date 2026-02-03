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
    // Aumenta o limite de aviso de tamanho de chunk para evitar warnings desnecessários
    chunkSizeWarningLimit: 1000
  }
});
