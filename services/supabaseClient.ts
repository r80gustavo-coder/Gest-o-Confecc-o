import { createClient } from '@supabase/supabase-js';

// Função auxiliar para buscar variáveis de ambiente em diferentes builds (Vite, CRA, Next.js)
const getEnvVar = (key: string, viteKey: string) => {
  let val = '';
  // Verifica process.env (CRA / Next.js / Node)
  if (typeof process !== 'undefined' && process.env) {
    val = process.env[key] || process.env[viteKey] || '';
  }
  // Verifica import.meta.env (Vite)
  if (!val) {
    try {
      // @ts-ignore
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        val = import.meta.env[key] || import.meta.env[viteKey] || '';
      }
    } catch (e) {
      // Ignora erros de acesso ao import.meta em ambientes que não suportam
    }
  }
  return val;
};

// Tenta buscar URL e KEY em diferentes padrões de nomenclatura
const supabaseUrl = getEnvVar('REACT_APP_SUPABASE_URL', 'VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnvVar('REACT_APP_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.warn("ATENÇÃO: Credenciais do Supabase não encontradas. Verifique as variáveis de ambiente no Vercel (Settings > Environment Variables).");
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');