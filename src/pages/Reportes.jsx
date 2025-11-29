import { useNavigate } from "react-router-dom";
import { 
  FileText, 
  Calendar, 
  PenTool, 
  Download, 
  ArrowRight,
  BarChart3
} from "lucide-react";
import "./Reportes.css";

export default function Reportes() {
  const navigate = useNavigate();

  return (
    <section id="reportes" className="rep-section">
      <div className="rep-container">
        
        {/* ENCABEZADO */}
        <div className="rep-header">
          <div className="rep-header-icon">
            <BarChart3 size={32} color="#00ffc8" />
          </div>
          <div className="rep-header-text">
            <h3>Reportes y Gestión</h3>
            <p>Totales por mes y año. Próximamente exportación a PDF.</p>
          </div>
        </div>

        {/* GRID DE TARJETAS */}
        <div className="rep-grid">
          
          {/* --- TARJETA 1: REPORTE MENSUAL --- */}
          <article className="rep-card">
            <div className="rep-icon-box blue">
              <FileText size={28} />
            </div>
            <h4>Reporte Mensual</h4>
            <p>Resumen del mes actual: total en parqueos y conteo de facturas.</p>
            <div className="rep-actions">
              {/* Navegación al Reporte Mensual */}
              <button className="rep-btn primary" onClick={() => navigate("/reportes/mensual")}>
                Ver Resumen
              </button>
              <button className="rep-btn outline">
                <Download size={16} /> Exportar PDF
              </button>
            </div>
          </article>

          {/* --- TARJETA 2: REPORTE ANUAL --- */}
          <article className="rep-card">
            <div className="rep-icon-box yellow">
              <Calendar size={28} />
            </div>
            <h4>Reporte Anual</h4>
            <p>Comparativa por meses y acumulado anual.</p>
            <div className="rep-actions">
              {/* Navegación al Reporte Anual */}
              <button className="rep-btn primary" onClick={() => navigate("/reportes/anual")}>
                Ver Anual <ArrowRight size={16} />
              </button>
            </div>
          </article>

          {/* --- TARJETA 3: FIRMAS --- */}
          <article className="rep-card">
            <div className="rep-icon-box pink">
              <PenTool size={28} />
            </div>
            <h4>Firmas</h4>
            <p>Espacio para gestionar firmas del técnico, coordinador y secretaria.</p>
            <div className="rep-actions">
              {/* Navegación a Configuración de Firmas */}
              <button className="rep-btn secondary" onClick={() => navigate("/reportes/firmas")}>
                Configurar
              </button>
            </div>
          </article>

        </div>
      </div>
    </section>
  );
}