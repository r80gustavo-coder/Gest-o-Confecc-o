import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.VITE_TURSO_DATABASE_URL': JSON.stringify(process.env.VITE_TURSO_DATABASE_URL),
    'process.env.VITE_TURSO_AUTH_TOKEN': JSON.stringify(process.env.VITE_TURSO_AUTH_TOKEN)
  }
});