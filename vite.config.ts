import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual (development, production)
  // O terceiro parâmetro '' garante que carregue todas as variáveis, não apenas as com prefixo VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Injeta as variáveis de forma segura no código cliente
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_TURSO_DATABASE_URL': JSON.stringify(env.VITE_TURSO_DATABASE_URL),
      'process.env.VITE_TURSO_AUTH_TOKEN': JSON.stringify(env.VITE_TURSO_AUTH_TOKEN)
    }
  };
});