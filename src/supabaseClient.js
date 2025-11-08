// src/lib/supabaseClient.ts

import { createClient } from "@supabase/supabase-js";

// Importamos las variables de entorno de Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificación Crítica: Lanzar un error si las claves no están configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  // Aseguramos que las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY 
  // estén definidas en el archivo .env o .env.local
  throw new Error("❌ Error de configuración: Faltan las variables VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.");
}

// Creamos y exportamos el cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);