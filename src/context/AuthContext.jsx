// ✅ src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // 🔹 Estado para la sesión
  const [session, setSession] = useState(null);

  // 🔹 Estado para controlar la carga inicial
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // 1️⃣ Al montar el componente, obtener la sesión actual
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false); // 🔹 Ya terminó la verificación
    });

    // 2️⃣ Escuchar los cambios en la sesión (login / logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false); // 🔹 Cuando cambie, también deja de cargar
    });

    // 3️⃣ Limpieza del listener al desmontar
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🚀 Iniciar sesión con Google
  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/perfil`, // 👈 redirige tras login
      },
    });
  };

  // 🚪 Cerrar sesión
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // 🧩 Variables derivadas
  const isAuthenticated = !!session; // true si hay sesión activa

  // 📦 Valor del contexto
  const value = {
    session,
    isAuthenticated,
    authLoading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 🪄 Hook personalizado para usar el contexto
export function useAuth() {
  return useContext(AuthContext);
}
