import { createClient } from '@supabase/supabase-js';

// Tenta pegar das variáveis de ambiente.
const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_ANON_KEY;

// Se não houver chaves configuradas, usa valores fictícios para não quebrar a inicialização do app (crash).
// As requisições falharão, mas o app abrirá e o Login mostrará o erro de conexão ou permitirá o modo offline.
const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'https://placeholder.supabase.co';
const supabaseKey = envKey && envKey.length > 0 ? envKey : 'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️ Supabase URL não encontrada. O app está rodando em modo desconectado.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);