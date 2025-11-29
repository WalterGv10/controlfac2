import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  FaRegClipboard,
  FaChartLine,
  FaSignOutAlt,
  FaUsers,
  FaBuilding
} from "react-icons/fa";

import "./Perfil.css";

const GRUPOS_TECNOLOGICOS = [
  "CAJEROS AUTOMATICOS",
  "SOPORTE AGENCIAS",
  "COMUNICACIONES WAN",
  "TELEFONIA"
];

export default function Perfil() {
  const { session, signOut } = useAuth();
  const user = session?.user;

  const metadata = user?.user_metadata || {};
  const [selectedGroup, setSelectedGroup] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user_group");
    if (stored) setSelectedGroup(stored);
  }, []);

  const updateGroup = (value) => {
    setSelectedGroup(value);
    localStorage.setItem("user_group", value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const username = useMemo(() => {
    if (!user?.email) return "Usuario";
    return user.email.split("@")[0];
  }, [user]);

  const avatar = metadata?.avatar_url;

  if (!session) return null;

  return (
    <main className="perfil-main material-bg">
      <div className="perfil-wrapper material-card">

        {/* Top bar */}
        <header className="material-topbar">
          <h1>Mi Perfil</h1>
          <button className="material-logout" onClick={signOut}>
            <FaSignOutAlt size={18} />
            <span>Salir</span>
          </button>
        </header>

        {/* User */}
        <section className="material-user">
          <div className="material-avatar">
            {avatar ? (
              <img src={avatar} alt="avatar" referrerPolicy="no-referrer" />
            ) : (
              <span>{username.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="material-user-text">
            <h2>{username}</h2>
            <p>{user.email}</p>
          </div>
        </section>

        {/* Grupo */}
        <section className="material-section">
          <label className="material-label">
            <FaBuilding size={16} />
            <span>División Tecnológica</span>
          </label>

          <select
            value={selectedGroup}
            onChange={(e) => updateGroup(e.target.value)}
            className="material-select"
          >
            <option value="" disabled>
              Selecciona un grupo
            </option>
            {GRUPOS_TECNOLOGICOS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {saved && <small className="material-saved">✓ Guardado</small>}
        </section>

        {/* Menu */}
        <nav className="material-menu-grid">

          {/* Tarjeta destacada: Firmas */}
          <Link to="/reportes/firmas" className="material-item">
            <div className="material-icon"><FaUsers size={36} /></div>
            <span className="material-title">Configurar Firmas</span>
            <p className="material-desc">Gestiona las firmas autorizadas para cobros y aprobaciones</p>
          </Link>

          {/* Resto de opciones */}
          <Link to="/facturas" className="material-item">
            <div className="material-icon"><FaRegClipboard size={28} /></div>
            <span className="material-title">Facturas</span>
            <p className="material-desc">Control y registro</p>
          </Link>

          <Link to="/reportes" className="material-item">
            <div className="material-icon"><FaChartLine size={28} /></div>
            <span className="material-title">Reportes</span>
            <p className="material-desc">Datos e informes</p>
          </Link>

        </nav>
      </div>
    </main>
  );
}