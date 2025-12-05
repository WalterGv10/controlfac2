import { useNavigate } from "react-router-dom";
import { Camera, FileText, Ticket, List, ChevronRight, Zap } from "lucide-react";
import "./Facturas.css";

export default function Facturas() {
  const navigate = useNavigate();

  return (
    <section className="facturas-main">
      <div className="container">
        
        {/* HEADER CON ANIMACIÓN */}
        <div className="facturas-header fade-in">
          <h1>Gestión de Gastos</h1>
          <p>Selecciona una operación</p>
        </div>

        {/* GRID DE OPCIONES */}
        <div className="facturas-grid">
          
          {/* 1. OCR (ESCANEAR) - DESTACADO */}
          <button 
            className="menu-card primary fade-in-up delay-1" 
            onClick={() => navigate("/importar-factura")}
          >
            <div className="card-bg-glow"></div>
            <div className="icon-wrapper neon">
              <Camera size={28} strokeWidth={2} />
            </div>
            <div className="card-content">
              <h4>Escanear con IA</h4>
              <p>Detectar datos automáticamente</p>
            </div>
            <div className="action-icon">
               <Zap size={20} className="zap-icon" />
            </div>
          </button>

          <div className="divider fade-in delay-2"><span>Ingreso Manual</span></div>

          {/* 2. FACTURA MANUAL (Fiscal) */}
          <button 
            className="menu-card fade-in-up delay-2" 
            onClick={() => navigate("/nueva-factura")}
          >
            <div className="icon-wrapper blue">
              <FileText size={24} />
            </div>
            <div className="card-content">
              <h4>Factura Contable</h4>
              <p>NIT, DTE y Serie requeridos</p>
            </div>
            <ChevronRight className="arrow-icon" />
          </button>

          {/* 3. RECIBO MUNICIPAL */}
          <button 
            className="menu-card fade-in-up delay-3" 
            onClick={() => navigate("/recibo-municipal")}
          >
            <div className="icon-wrapper orange">
              <Ticket size={24} />
            </div>
            <div className="card-content">
              <h4>Recibo Municipal</h4>
              <p>Tickets de Parqueo y Peaje</p>
            </div>
            <ChevronRight className="arrow-icon" />
          </button>

        </div>

        {/* FOOTER */}
        <div className="facturas-footer fade-in delay-3">
           <button className="history-button" onClick={() => navigate("/mis-facturas")}>
              <List size={20} /> 
              <span>Ver Historial de Gastos</span>
           </button>
        </div>

      </div>
    </section>
  );
}