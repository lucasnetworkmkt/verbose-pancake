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
      // Alguns pacotes dependem de process.env, isso evita que o build quebre
      'process.env': {
        API_KEY: JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
        GEMINI_API_KEY: JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || env.API_KEY || process.env.API_KEY || '')
      }
    },
    build: {
      // Aumenta o limite de aviso de tamanho de chunk para evitar warnings desnecessários
      chunkSizeWarningLimit: 1000
    }
  };
});
