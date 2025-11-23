import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente devem ser configuradas na Vercel ou no arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL ou Key não encontradas. Verifique as variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);