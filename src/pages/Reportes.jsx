import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Calendar, 
  PenTool, 
  ArrowRight,
  BarChart3
} from "lucide-react";
import "./Reportes.css";

export default function Reportes() {
  const navigate = useNavigate();

  return (
    <section className="rep-section">
      <div className="rep-wrapper">
        
        {/* ENCABEZADO COMPACTO */}
        <div className="rep-header">
          <div className="rep-header-icon">
            <BarChart3 size={28} />
          </div>
          <div className="rep-header-text">
            <h3>Panel de Control</h3>
            <p>Resumen financiero y gestión.</p>
          </div>
        </div>

        {/* GRID PRINCIPAL (AUTO-AJUSTABLE) */}
        <div className="rep-grid">
          
          {/* --- TARJETA 1: REPORTE MENSUAL (DESTACADA) --- */}
          <article className="rep-card primary" onClick={() => navigate("/reportes/mensual")}>
            <div className="card-bg-glow"></div>
            <div className="rep-content-row">
                <div className="rep-icon-box cyan">
                <FileText size={24} />
                </div>
                <div className="rep-info">
                    <h4>Reporte Mensual</h4>
                    <p>Cierre de caja y totales del mes.</p>
                </div>
                <div className="rep-arrow">
                    <ArrowRight size={20} />
                </div>
            </div>
          </article>

          {/* --- TARJETA 2: REPORTE ANUAL --- */}
          <article className="rep-card" onClick={() => navigate("/reportes/anual")}>
            <div className="rep-content-row">
                <div className="rep-icon-box purple">
                <Calendar size={24} />
                </div>
                <div className="rep-info">
                    <h4>Reporte Anual</h4>
                    <p>Comparativa histórica.</p>
                </div>
                <div className="rep-arrow">
                    <ArrowRight size={20} />
                </div>
            </div>
          </article>

          {/* --- TARJETA 3: FIRMAS --- */}
          <article className="rep-card" onClick={() => navigate("/reportes/firmas")}>
            <div className="rep-content-row">
                <div className="rep-icon-box pink">
                <PenTool size={24} />
                </div>
                <div className="rep-info">
                    <h4>Configurar Firmas</h4>
                    <p>Autorizaciones de documentos.</p>
                </div>
                <div className="rep-arrow">
                    <ArrowRight size={20} />
                </div>
            </div>
          </article>

        </div>
      </div>
    </section>
  );
}