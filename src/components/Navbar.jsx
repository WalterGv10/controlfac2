// ✅ src/components/Navbar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  // 🚪 Cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const linkClass = ({ isActive }) =>
    "nav-link" + (isActive ? " active" : "");

  // 👤 Datos del usuario
  const userName = session?.user?.user_metadata?.full_name || session?.user?.email;

  return (
    <header className="navbar glass">
      {/* 🟦 Marca del sistema */}
      <div className="nav-left">
        <span className="brand">CONTROLFAC</span>
        <span className="brand-dot" />
      </div>

      {/* 🟩 Navegación y usuario */}
      <nav className="nav-right">
        <NavLink to="/facturas" className={linkClass}>Facturas</NavLink>
        <NavLink to="/reportes" className={linkClass}>Reportes</NavLink>
        <NavLink to="/perfil" className={linkClass}>Perfil</NavLink>

        <div className="user-area">
          <span className="user-chip">👤 {userName}</span>
          <button className="btn-logout" onClick={handleLogout}>Salir</button>
        </div>
      </nav>
    </header>
  );
}
