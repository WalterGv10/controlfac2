import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FcGoogle } from "react-icons/fc";
import "./Login.css";
import logo from "../assets/logo.png";

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    // Detecta automáticamente si estás en local o Netlify
    const redirectUrl = window.location.origin;

    try {
      const { error } = await signInWithGoogle({
        provider: "google",
        options: { redirectTo: redirectUrl }, // 🔹 Redirige al dominio actual
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message);
      console.error("Error en el login:", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="bg-decoration"></div>

      <section className="login-card">
        {/* 🧿 Logo principal */}
        <img src={logo} alt="ControlFAC logo" className="login-logo" />

        <h1 className="title">CONTROLFAC</h1>
        <p className="subtitle">Gestión de facturas y reportes técnicos</p>

        <button
          className="btn-google"
          onClick={handleLogin}
          disabled={loading}
        >
          <FcGoogle size={22} />
          {loading ? "Ingresando..." : "Ingresar con Google"}
        </button>

        {error && <p className="error-text">Error: {error}</p>}

        <p className="hint">
          Inicia sesión para registrar gastos y generar reportes.
        </p>
      </section>
    </div>
  );
}
