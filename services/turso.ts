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

let url = getEnv('VITE_TURSO_DATABASE_URL') || "";
let authToken = getEnv('VITE_TURSO_AUTH_TOKEN') || "";

// --- SANITIZAÇÃO (Limpeza de espaços e quebras de linha) ---
// Remove aspas extras que as vezes vem do .env mal formatado
url = url.replace(/['"]/g, '').trim();
authToken = authToken.replace(/['"]/g, '').trim();

// --- CORREÇÃO AUTOMÁTICA DE URL ---
if (url) {
  // 1. Forçar protocolo HTTPS (Navegadores não aceitam libsql://)
  // Substitui qualquer protocolo inicial por https://
  url = url.replace(/^[a-zA-Z]+:\/\//, 'https://');

  // 2. Tentar limpar se o usuário colou o token junto com a URL (ex: ...turso.io.eyJhbG...)
  // O padrão Turso é algo-como-isso.turso.io
  const cleanUrlMatch = url.match(/(https?:\/\/[a-zA-Z0-9-]+\.[a-z0-9-]+\.turso\.io)/);
  if (cleanUrlMatch) {
    url = cleanUrlMatch[1];
  }
}

// Debug log para o usuário ver no console do navegador (F12)
console.log("[TURSO SETUP] URL Final:", url);
console.log("[TURSO SETUP] Token Length:", authToken.length);

export const turso = createClient({
  url: url || "https://db-placeholder.turso.io", 
  authToken: authToken,
});