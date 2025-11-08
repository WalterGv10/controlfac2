import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación temprana para errores de configuración
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Faltan variables de entorno de Supabase.");
  console.error("Revisa .env(.local) y el prefijo VITE_.");
  throw new Error("Supabase no configurado: VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Guarda sesión en localStorage
    autoRefreshToken: true,      // Refresca tokens automáticamente
    detectSessionInUrl: true,    // Lee el callback OAuth de la URL
  },
});
 