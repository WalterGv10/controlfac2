import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { FiFileText, FiBarChart2, FiLogOut } from "react-icons/fi";
import "./Perfil.css";

export default function Perfil() {
  const { session, signOut } = useAuth();

  return (
    <main id="perfil" className="perfil-main glass-bg">
      <div className="profile-panel">
        <button onClick={signOut} className="logout-btn" title="Cerrar sesión">
          <FiLogOut size={22} />
        </button>

        <div className="profile-top">
          <div className="avatar-wrap">
            <img
              src={session?.user?.user_metadata?.avatar_url}
              alt="avatar"
              className="avatar"
            />
          </div>
          <h1>{session?.user?.email?.split("@")[0] || "Usuario"}</h1>
          <p>{session?.user?.email}</p>
        </div>

        <div className="cards-wrap">
          <Link to="/facturas" className="card glass">
            <FiFileText size={30} />
            <h3>Gestión de Facturas</h3>
            <p>Registra y administra tus facturas de parqueo.</p>
          </Link>

          <Link to="/reportes" className="card glass">
            <FiBarChart2 size={30} />
            <h3>Generar Reportes</h3>
            <p>Genera reportes mensuales y anuales fácilmente.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
