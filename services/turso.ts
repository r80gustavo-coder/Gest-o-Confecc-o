import { createClient } from "@libsql/client/web";

const getEnv = (key: string) => {
  // Tenta pegar do import.meta.env (Padrão Vite)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key];
  }
  
  // Tenta pegar do process.env (Fallback / Node)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  
  return '';
};

const url = getEnv('VITE_TURSO_DATABASE_URL');
const authToken = getEnv('VITE_TURSO_AUTH_TOKEN');

if (!url) {
  console.warn("VITE_TURSO_DATABASE_URL não encontrada. Verifique se o arquivo .env foi criado.");
}

export const turso = createClient({
  url: url || "libsql://db-placeholder.turso.io", // URL dummy para não crashar a inicialização
  authToken: authToken || "",
});