
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do diretório atual.
  // O terceiro parâmetro '' diz ao Vite para carregar TODAS as variáveis, 
  // não apenas as que começam com VITE_.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    server: {
      host: true
    },
    define: {
      // Injeta a API_KEY especificamente. 
      // Isso substitui "process.env.API_KEY" no código pelo valor real da chave durante o build.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      
      // Mantém o polyfill vazio para o resto do objeto process.env 
      // para evitar quebras de bibliotecas que esperam Node.js
      'process.env': {}
    },
    build: {
      // Aumenta o limite de aviso de tamanho de chunk para evitar warnings desnecessários
      chunkSizeWarningLimit: 1000
    }
  };
});
