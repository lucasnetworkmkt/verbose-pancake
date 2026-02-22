import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: true
    },
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || env.API_KEY || 'AIzaSyBs3JNZGCmq5VOnpDNrju8t15zVXWUQgRo')
    },
    build: {
      // Aumenta o limite de aviso de tamanho de chunk para evitar warnings desnecessários
      chunkSizeWarningLimit: 1000
    }
  };
});
