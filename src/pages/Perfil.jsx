import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { FaRegClipboard, FaChartLine, FaSignOutAlt } from "react-icons/fa";
import "./Perfil.css";

const DEFAULT_USERNAME = "Usuario Parkeador";

export default function Perfil() {
  const { session, signOut } = useAuth();
  const user = session?.user;
  const metadata = user?.user_metadata || {};

  const userName = useMemo(
    () => (user?.email ? user.email.split("@")[0] : DEFAULT_USERNAME),
    [user]
  );

  const avatarSrc = metadata?.avatar_url;

  if (!session) {
    return (
      <main className="perfil-main futuristic-bg">
        <div className="profile-container neo-glass">
          <div className="loader">Cargando perfil...</div>
        </div>
      </main>
    );
  }

  return (
    <main id="perfil" className="perfil-main futuristic-bg">
      <div className="profile-container neo-glass">
        {/* Botón de cierre de sesión */}
        <button
          onClick={signOut}
          className="neon-logout-btn"
          title="Cerrar sesión"
        >
          <FaSignOutAlt size={18} aria-label="Cerrar sesión" />
          <span>Cerrar Sesión</span>
        </button>

        {/* Encabezado del perfil */}
        <header className="profile-header">
          <h2 className="welcome-text">¡Bienvenido!</h2>

          <div className="avatar-section">
            <div className="avatar-wrap glow-border">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={`Avatar de ${userName}`}
                  className="avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="avatar-placeholder">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="neon-sign">
              <span className="neon-text">{userName}</span>
            </div>
          </div>
        </header>

        {/* Navegación principal */}
        <nav className="navigation-grid">
          <Link to="/facturas" className="nav-card neon-card" aria-label="Ir a Facturas">
            <FaRegClipboard size={36} />
            <div className="card-info">
              <h3>Facturas</h3>
              <p>Registra y administra tus documentos de parqueo.</p>
            </div>
          </Link>

          <Link to="/reportes" className="nav-card neon-card" aria-label="Ir a Reportes">
            <FaChartLine size={36} />
            <div className="card-info">
              <h3>Reportes</h3>
              <p>Genera análisis estadísticos y visualiza datos.</p>
            </div>
          </Link>
        </nav>
      </div>
    </main>
  );
}
