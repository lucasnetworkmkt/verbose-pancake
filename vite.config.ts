
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do diretório atual.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true
    },
    define: {
      // Define process.env como um objeto contendo a API_KEY.
      // Isso é mais seguro do que definir process.env.API_KEY e depois process.env = {}
      'process.env': JSON.stringify({
        API_KEY: env.API_KEY,
        NODE_ENV: mode
      })
    },
    build: {
      chunkSizeWarningLimit: 1000
    }
  };
});
