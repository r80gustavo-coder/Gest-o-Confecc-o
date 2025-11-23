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

let url = getEnv('VITE_TURSO_DATABASE_URL');
const authToken = getEnv('VITE_TURSO_AUTH_TOKEN');

// --- CORREÇÃO AUTOMÁTICA DE URL ---
if (url) {
  // 1. Forçar protocolo HTTPS (Navegadores não aceitam libsql://)
  if (url.startsWith('libsql://')) {
    url = url.replace('libsql://', 'https://');
  }

  // 2. Tentar limpar se o usuário colou o token junto com a URL (ex: ...turso.io.eyJhbG...)
  // O padrão Turso é algo-como-isso.turso.io
  const cleanUrlMatch = url.match(/(https?:\/\/[a-zA-Z0-9-]+\.[a-z0-9-]+\.turso\.io)/);
  if (cleanUrlMatch) {
    url = cleanUrlMatch[1];
  }
}

if (!url) {
  console.warn("VITE_TURSO_DATABASE_URL não encontrada. Verifique se o arquivo .env foi criado.");
}

console.log("Conectando ao Turso em:", url); // Log para debug

export const turso = createClient({
  url: url || "https://db-placeholder.turso.io", 
  authToken: authToken || "",
});