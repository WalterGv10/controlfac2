import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  FileText, 
  Banknote, 
  MapPin, 
  Hash, 
  CreditCard,
  Edit2,
  Save,
  X,
  CheckCircle, 
  RotateCcw    
} from "lucide-react";
import "./DetalleFactura.css";

export default function DetalleFactura() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // --- FUNCIÓN PARA CARGAR DATOS (Reutilizable) ---
  const fetchFactura = async () => {
    // No ponemos setLoading(true) aquí para evitar parpadeos al cancelar edición
    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .eq("id", id)
      .single();

    if (error) console.error("Error:", error);
    else setFormData(data);
    
    setLoading(false);
  };

  // --- 1. EFECTO INICIAL DE CARGA ---
  useEffect(() => {
    fetchFactura();
  }, [id]);

  // --- 2. DETECTAR SI DEBE ABRIRSE EN MODO EDICIÓN ---
  useEffect(() => {
    if (location.state?.startEditing) {
      setIsEditing(true);
    }
  }, [location]);

  // --- MANEJAR INPUTS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // --- GUARDAR CAMBIOS ---
  const handleSave = async () => {
    const confirm = window.confirm("¿Deseas guardar los cambios?");
    if (!confirm) return;

    const { error } = await supabase
      .from("facturas")
      .update({
        monto: formData.monto,
        fecha: formData.fecha,
        serie: formData.serie,
        dte: formData.dte,
        nit_emisor: formData.nit_emisor,
        punto_servicio: formData.punto_servicio,
        tecnico: formData.tecnico,
        motivo_visita: formData.motivo_visita,
        estado: formData.estado
      })
      .eq("id", id);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setIsEditing(false);
      // Limpiamos el estado de navegación para que no vuelva a abrirse solo
      navigate(location.pathname, { replace: true, state: {} });
      alert("¡Cambios guardados exitosamente!");
    }
  };

  // --- CANCELAR EDICIÓN (CORREGIDO) ---
  const handleCancel = () => {
    // 1. Salimos del modo edición
    setIsEditing(false);
    
    // 2. ¡IMPORTANTE! Limpiamos la "memoria" de navegación.
    // Esto evita que al renderizar de nuevo, el useEffect vuelva a abrir la edición.
    navigate(location.pathname, { replace: true, state: {} });

    // 3. Recargamos los datos originales de la BD
    // (Por si escribiste algo y luego te arrepentiste, para que no quede el texto sucio)
    fetchFactura();
  };

  // --- CAMBIO RÁPIDO DE ESTADO ---
  const toggleStatus = async () => {
    const nuevoEstado = formData.estado === "Pagada" ? "Pendiente" : "Pagada";
    const mensaje = nuevoEstado === "Pagada" 
      ? "¿Confirmas que esta factura ya fue pagada?" 
      : "¿Revertir factura a Pendiente?";

    if (!window.confirm(mensaje)) return;

    const { error } = await supabase
      .from("facturas")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setFormData({ ...formData, estado: nuevoEstado });
    }
  };

  if (loading) return <div className="df-loading">Cargando detalle...</div>;
  if (!formData) return <div className="df-error">Factura no encontrada.</div>;

  return (
    <section className="df-section">
      <div className="df-card">
        
        {/* HEADER */}
        <div className="df-header">
          <div className="df-header-left">
            <button onClick={() => navigate(-1)} className="df-back-btn">
              <ArrowLeft size={20} />
            </button>
            <h2 className="df-title">{isEditing ? "Editando Factura" : "Detalle"}</h2>
          </div>

          <div className="df-controls">
            {!isEditing ? (
              <button className="df-action-btn edit" onClick={() => setIsEditing(true)}>
                <Edit2 size={18} /> Editar
              </button>
            ) : (
              <>
                {/* Botón Cancelar Corregido */}
                <button className="df-action-btn cancel" onClick={handleCancel}>
                  <X size={18} />
                </button>
                <button className="df-action-btn save" onClick={handleSave}>
                  <Save size={18} /> Guardar
                </button>
              </>
            )}
          </div>
        </div>

        {/* --- SECCIÓN DE ESTADO --- */}
        <div className="df-status-section">
          {isEditing ? (
            <div className="df-edit-status">
              <label>Estado:</label>
              <select name="estado" value={formData.estado} onChange={handleChange} className="df-input-select">
                <option value="Pendiente">Pendiente</option>
                <option value="Pagada">Pagada</option>
              </select>
            </div>
          ) : (
            <div className="df-status-display">
              <div className={`df-status-badge status-${formData.estado === 'Pagada' ? 'green' : 'yellow'}`}>
                {formData.estado || 'Pendiente'}
              </div>

              <button 
                className={`df-quick-toggle ${formData.estado === 'Pagada' ? 'undo' : 'pay'}`}
                onClick={toggleStatus}
              >
                {formData.estado === 'Pagada' ? (
                  <> <RotateCcw size={16} /> Revertir a Pendiente </>
                ) : (
                  <> <CheckCircle size={16} /> Marcar como Pagada </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* GRID DE DATOS */}
        <div className="df-grid">
          
          {/* BLOQUE 1 */}
          <div className="df-block highlight">
            <div className="df-row">
              <Banknote size={20} className="df-icon" />
              <div style={{width: '100%'}}>
                <label>Monto Total</label>
                {isEditing ? (
                  <div className="df-input-wrapper">
                    <span className="prefix">Q</span>
                    <input 
                      type="number" 
                      name="monto" 
                      value={formData.monto} 
                      onChange={handleChange} 
                      className="df-input big"
                    />
                  </div>
                ) : (
                  <p className="df-value big">Q {Number(formData.monto).toFixed(2)}</p>
                )}
              </div>
            </div>

            <div className="df-row">
              <Calendar size={20} className="df-icon" />
              <div style={{width: '100%'}}>
                <label>Fecha del Servicio</label>
                {isEditing ? (
                  <input 
                    type="date" 
                    name="fecha" 
                    value={formData.fecha} 
                    onChange={handleChange} 
                    className="df-input"
                  />
                ) : (
                  <p className="df-value">{formData.fecha}</p>
                )}
              </div>
            </div>
          </div>

          {/* BLOQUE 2 */}
          <div className="df-block">
            <div className="df-item">
              <Hash size={16} className="df-icon-sm" />
              <div className="df-data-col">
                <label>Serie</label>
                {isEditing ? (
                  <input type="text" name="serie" value={formData.serie} onChange={handleChange} className="df-input sm" />
                ) : (
                  <p>{formData.serie}</p>
                )}
              </div>
            </div>

            <div className="df-item">
              <FileText size={16} className="df-icon-sm" />
              <div className="df-data-col">
                <label>Número DTE</label>
                {isEditing ? (
                  <input type="text" name="dte" value={formData.dte} onChange={handleChange} className="df-input sm" />
                ) : (
                  <p>{formData.dte}</p>
                )}
              </div>
            </div>

            <div className="df-item">
              <CreditCard size={16} className="df-icon-sm" />
              <div className="df-data-col">
                <label>NIT Emisor</label>
                {isEditing ? (
                  <input type="text" name="nit_emisor" value={formData.nit_emisor} onChange={handleChange} className="df-input sm" />
                ) : (
                  <p>{formData.nit_emisor}</p>
                )}
              </div>
            </div>
          </div>

          {/* BLOQUE 3 */}
          <div className="df-block">
            <div className="df-item">
              <MapPin size={16} className="df-icon-sm" />
              <div className="df-data-col">
                <label>Punto de Servicio</label>
                {isEditing ? (
                  <input type="text" name="punto_servicio" value={formData.punto_servicio} onChange={handleChange} className="df-input sm" />
                ) : (
                  <p>{formData.punto_servicio}</p>
                )}
              </div>
            </div>
            <div className="df-item">
              <User size={16} className="df-icon-sm" />
              <div className="df-data-col">
                <label>Técnico Responsable</label>
                {isEditing ? (
                  <input type="text" name="tecnico" value={formData.tecnico} onChange={handleChange} className="df-input sm" />
                ) : (
                  <p>{formData.tecnico}</p>
                )}
              </div>
            </div>
          </div>

          {/* BLOQUE 4 */}
          <div className="df-block full-width">
            <label className="df-label-desc">Motivo de Visita / Descripción</label>
            {isEditing ? (
              <textarea 
                name="motivo_visita" 
                value={formData.motivo_visita || ""} 
                onChange={handleChange} 
                className="df-textarea"
                rows="3"
              />
            ) : (
              <div className="df-desc-box">
                {formData.motivo_visita || formData.descripcion || "Sin descripción detallada."}
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}