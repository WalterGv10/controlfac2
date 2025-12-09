import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  Flame, 
  Calendar, 
  RotateCcw, 
  Eye, 
  Edit, 
  Trash2,
  Ticket,     // 👈 Nuevo Icono para Recibos
  FileText    // 👈 Nuevo Icono para Facturas
} from "lucide-react";
import "./MisFacturas.css";

export default function MisFacturas() {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- CARGAR DATOS ---
  useEffect(() => {
    fetchFacturas();
  }, []);

  const fetchFacturas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .order("fecha", { ascending: false });

    if (error) console.error("Error:", error);
    else setFacturas(data || []);
    setLoading(false);
  };

  // ✅ HELPER: Formatear Fecha (YYYY-MM-DD -> DD/MM/AAAA)
  const formatDate = (dateStr) => {
    if (!dateStr) return "--/--/----";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // ✅ HELPER: Identificar si es Recibo Municipal
  const isMunicipal = (fac) => {
    return fac.dte === 'TICKET' || fac.tipo === 'PARQUEO' || fac.tipo === 'PEAJE';
  };

  // --- LÓGICA DE ESTADOS VISUALES ---
  const getEstadoVisual = (factura) => {
    if (factura.estado === "Pagada") {
      return { label: "Pagada", color: "green", icon: <CheckCircle size={14} /> };
    }

    const diasPasados = Math.ceil((new Date() - new Date(factura.fecha)) / (1000 * 60 * 60 * 24));

    if (diasPasados > 45) {
      return { label: "¡Patear Hormiguero!", color: "red-intense", icon: <Flame size={14} /> };
    } else if (diasPasados > 30) {
      return { label: "Atrasada", color: "red", icon: <AlertTriangle size={14} /> };
    } else {
      return { label: "Pendiente", color: "yellow", icon: <Calendar size={14} /> };
    }
  };

  // --- ACCIONES ---
  const toggleEstado = async (id, estadoActual) => {
    const nuevoEstado = estadoActual === "Pagada" ? "Pendiente" : "Pagada";
    const mensaje = nuevoEstado === "Pagada" 
      ? "¿Confirmas el pago?" 
      : "¿Revertir a Pendiente?";

    if (!window.confirm(mensaje)) return;

    const { error } = await supabase.from("facturas").update({ estado: nuevoEstado }).eq("id", id);
    if (error) alert("Error al actualizar");
    else fetchFacturas();
  };

  const eliminarFactura = async (id) => {
    if (!window.confirm("⚠️ ¿Estás seguro de BORRAR esta factura permanentemente?")) return;
    const { error } = await supabase.from("facturas").delete().eq("id", id);
    if (error) alert("Error al borrar: " + error.message);
    else fetchFacturas();
  };

  const editarFactura = (factura) => {
    navigate(`/factura/${factura.id}`, { state: { startEditing: true } });
  };

  return (
    <section className="mf-section">
      <div className="mf-container">
        
        <div className="mf-header">
          <button onClick={() => navigate("/facturas")} className="mf-back-btn">
            <ArrowLeft size={20} /> Volver
          </button>
          <h2 className="mf-title">Historial de Gastos</h2>
        </div>

        <div className="mf-grid">
          {loading ? (
            <p className="mf-loading">Cargando facturas...</p>
          ) : facturas.length === 0 ? (
            <div className="mf-empty">No hay facturas registradas.</div>
          ) : (
            facturas.map((fac) => {
              const estado = getEstadoVisual(fac);
              const esTicket = isMunicipal(fac); // Detectamos tipo

              return (
                <div key={fac.id} className={`mf-card border-${estado.color}`}>
                  
                  {/* CABECERA TARJETA */}
                  <div className="mf-card-top">
                    {/* 🔹 Identificador Visual de Tipo */}
                    <span className="mf-serie" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {esTicket ? (
                        <>
                           <Ticket size={16} color="#fb923c" /> 
                           <span style={{ color: '#fb923c' }}>Recibo #{fac.serie}</span>
                        </>
                      ) : (
                        <>
                           <FileText size={16} color="#60a5fa" /> 
                           <span style={{ color: '#60a5fa' }}>Factura #{fac.serie}</span>
                        </>
                      )}
                    </span>
                    
                    <span className={`mf-badge bg-${estado.color}`}>
                      {estado.icon} {estado.label}
                    </span>
                  </div>

                  {/* CUERPO TARJETA */}
                  <div className="mf-card-body">
                    <h3 className="mf-monto">Q {Number(fac.monto).toFixed(2)}</h3>
                    <p className="mf-cliente">
                        {fac.cliente || fac.punto_servicio}
                        {fac.nit_emisor && <span style={{opacity:0.6, fontSize:'0.8em', display:'block'}}>NIT: {fac.nit_emisor}</span>}
                    </p>
                    
                    <p className="mf-meta">
                      {/* ✅ Fecha Formateada */}
                      📅 {formatDate(fac.fecha)} • 👨‍🔧 {fac.tecnico}
                    </p>
                    <p className="mf-desc">{fac.descripcion || fac.motivo_visita}</p>
                  </div>

                  {/* PIE DE TARJETA: ACCIONES */}
                  <div className="mf-card-footer">
                    <div className="mf-tools">
                      <button title="Ver detalles" className="mf-icon-btn view" onClick={() => navigate(`/factura/${fac.id}`)}>
                        <Eye size={18} />
                      </button>
                      <button title="Editar" className="mf-icon-btn edit" onClick={() => editarFactura(fac)}>
                        <Edit size={18} />
                      </button>
                      <button title="Borrar" className="mf-icon-btn delete" onClick={() => eliminarFactura(fac.id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="mf-main-action">
                      {fac.estado !== "Pagada" ? (
                        <button className="mf-btn-pay" onClick={() => toggleEstado(fac.id, fac.estado)}>
                           Marcar como Pagada
                        </button>
                      ) : (
                        <button className="mf-btn-undo" onClick={() => toggleEstado(fac.id, fac.estado)}>
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}