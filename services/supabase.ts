import { createClient } from '@supabase/supabase-js';

// Tenta pegar das variáveis de ambiente ou usa strings vazias para evitar crash inicial
// O usuário deve configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);