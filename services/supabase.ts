import { createClient } from '@supabase/supabase-js';

// Credenciais de Fallback (Garante que o app funcione mesmo se as variáveis de ambiente falharem)
const DEFAULT_URL = "https://ulhcfwfoewdviirhupts.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsaGNmd2ZvZXdkdmlpcmh1cHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjE1NzAsImV4cCI6MjA4NTYzNzU3MH0.WBRcoTPvb-rHCb5IYo72pyAoqL2qPZT-vuxOdj4p5So";

let supabaseUrl = DEFAULT_URL;
let supabaseKey = DEFAULT_KEY;

try {
  // Tenta ler do Vite environment de forma segura
  // Usamos @ts-ignore para evitar erros de tipagem caso o ambiente esteja mal configurado
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) {
    // @ts-ignore
    supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  }
  
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    // @ts-ignore
    supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
} catch (error) {
  console.warn("Aviso: Não foi possível ler variáveis de ambiente (import.meta.env). Usando credenciais padrão de fallback.");
}

// Inicializa o cliente com a URL/Key encontrada ou o Fallback
export const supabase = createClient(supabaseUrl, supabaseKey);
