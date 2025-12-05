import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Check, X, AlertCircle, Building, User, MapPin, Car, Ticket } from "lucide-react";
import logo from "../assets/logo.png";
import "./ReciboMunicipal.css";

export default function ReciboMunicipal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  /* ----------------------------------------
   * ESTADO INICIAL
   * ---------------------------------------- */
  const initialState = {
    tipo: "PARQUEO", // Por defecto
    fecha: new Date().toISOString().split("T")[0],
    nit_emisor: "",       // Opcional
    serie: "",            // Número Contable
    dte: "TICKET",        // Valor fijo interno
    punto_servicio: "",   // Municipalidad
    tecnico: "",
    grupo: "",
    motivo_visita: "",
    monto: "",
    estado: "Pendiente",
  };

  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showToast, setShowToast] = useState(false);

  /* ----------------------------------------
   * 1. DETECTAR DATOS DE PERFIL (Auto-llenado)
   * ---------------------------------------- */
  useEffect(() => {
    async function loadUserDefaultData() {
      if (!session?.user) return;
      try {
        const { data } = await supabase.from('perfiles').select('grupo_tecnico, nombre_tecnico').eq('id', session.user.id).single();
        if (data) {
          setFormData(prev => ({ 
            ...prev, 
            grupo: data.grupo_tecnico || prev.grupo, 
            tecnico: data.nombre_tecnico || prev.tecnico 
          }));
        }
      } catch (err) { console.error(err); }
    }
    loadUserDefaultData();
    
    // Si viene pre-seleccionado desde el menú (state: { initialType: 'PEAJE' })
    if (location.state?.initialType) {
        setFormData(prev => ({ ...prev, tipo: location.state.initialType }));
    }
  }, [session, location]);

  /* ----------------------------------------
   * VALIDACIONES (Más relajadas que Factura)
   * ---------------------------------------- */
  const validate = (name, value) => {
    let error = "";
    switch (name) {
      case "serie":
        if (!value) error = "Requerido";
        if (value && value.length > 25) error = "Máximo 25 caracteres";
        break;
      case "punto_servicio": // Municipalidad
        if (!value) error = "Requerido (Ej: Muni Guate)";
        break;
      case "monto":
        if (!value) error = "Requerido";
        else if (!/^\d+(\.\d{1,2})?$/.test(value)) error = "Monto inválido";
        break;
      case "fecha":
        if (new Date(value) > new Date().setHours(23,59,59,999)) error = "Fecha futura";
        break;
      default: break;
    }
    return error;
  };

  /* ----------------------------------------
   * HANDLERS
   * ---------------------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;

    if (name === "monto") formatted = value.replace(/[^0-9.]/g, "");
    if (name === "serie") formatted = value.toUpperCase();

    const newData = { ...formData, [name]: formatted };
    setFormData(newData);
    setErrors({ ...errors, [name]: validate(name, formatted) });
  };

  const toggleType = () => {
      const newType = formData.tipo === 'PARQUEO' ? 'PEAJE' : 'PARQUEO';
      setFormData({ ...formData, tipo: newType });
  };

  const handleStatusChange = (newStatus) => {
    setFormData({ ...formData, estado: newStatus });
  };

  const handleBlur = (e) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  const handleSubmit = async () => {
    const newErrors = {};
    const newTouched = {};
    
    // Campos obligatorios para Recibo Municipal
    const requiredFields = ['fecha', 'serie', 'punto_servicio', 'monto', 'tecnico'];

    requiredFields.forEach((key) => {
      newTouched[key] = true;
      if (!formData[key]) newErrors[key] = "Campo requerido";
      else {
          const err = validate(key, formData[key]);
          if(err) newErrors[key] = err;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      // Guardamos NIT como vacio si no se puso nada, para que no guarde "undefined"
      const dataToSave = {
          ...formData,
          nit_emisor: formData.nit_emisor || '' 
      };

      const { error } = await supabase.from("facturas").insert([dataToSave]);
      if (error) throw error;
      
      setShowToast(true);
      setTimeout(() => navigate("/facturas"), 1500);
    } catch (err) {
      setErrors({ submit: "Error: " + err.message });
      setLoading(false);
    }
  };

  const isFieldValid = (name) => touched[name] && !errors[name] && formData[name];
  const isFieldInvalid = (name) => touched[name] && errors[name];

  return (
    <section className="rm-section">
      <div className="rm-card">
        <button className="rm-close" onClick={() => navigate("/facturas")} aria-label="Cerrar">
          <X size={20} />
        </button>

        <h2 className="rm-title">
          <img src={logo} alt="logo" className="rm-title-logo" />
          Recibo Municipal
        </h2>

        {/* --- INFO AUTOMÁTICA --- */}
        <div className="rm-auto-info">
          {formData.grupo && (
            <div className="rm-badge">
              <Building size={14} /> <span>{formData.grupo}</span>
            </div>
          )}
          {formData.tecnico && (
            <div className="rm-badge">
              <User size={14} /> <span>{formData.tecnico}</span>
            </div>
          )}
        </div>

        {/* --- SWITCH TOGGLE (PARQUEO / PEAJE) --- */}
        <div className="rm-switch-container">
            <div className="rm-switch" onClick={toggleType}>
                <div className={`rm-switch-option ${formData.tipo === 'PARQUEO' ? 'active' : ''}`}>
                    <Car size={16} /> Parqueo
                </div>
                <div className={`rm-switch-option ${formData.tipo === 'PEAJE' ? 'active' : ''}`}>
                    <MapPin size={16} /> Peaje
                </div>
                <div className={`rm-switch-slider ${formData.tipo === 'PEAJE' ? 'right' : 'left'}`}></div>
            </div>
        </div>

        <div className="rm-form">
          <div className="rm-main-grid">
            
            {/* COLUMNA 1 */}
            <div className="rm-grid-col">
              <div className="rm-block">
                <h4 className="rm-block-title">Datos del Ticket</h4>
                
                <div className="rm-field" style={{ marginBottom: "1rem" }}>
                  <label>Estado</label>
                  <div className="rm-status-row">
                    <button type="button" className={`rm-status-btn pending ${formData.estado === "Pendiente" ? "active" : ""}`} onClick={() => handleStatusChange("Pendiente")}>⏳ Pendiente</button>
                    <button type="button" className={`rm-status-btn paid ${formData.estado === "Pagada" ? "active" : ""}`} onClick={() => handleStatusChange("Pagada")}>💵 Pagada</button>
                  </div>
                </div>

                <div className="rm-row">
                    <div className={`rm-field required ${isFieldValid("fecha") ? "valid" : ""} ${isFieldInvalid("fecha") ? "invalid" : ""}`}>
                        <label>Fecha</label>
                        <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} onBlur={handleBlur} />
                        {isFieldValid("fecha") && <div className="rm-field-icon"><Check size={16} /></div>}
                    </div>
                </div>

                <div className="rm-row">
                    <div className={`rm-field required ${isFieldValid("serie") ? "valid" : ""} ${isFieldInvalid("serie") ? "invalid" : ""}`}>
                        <label>Número Contable / Ticket</label>
                        <input type="text" name="serie" placeholder="Ej: 001293" value={formData.serie} onChange={handleChange} onBlur={handleBlur} />
                        {isFieldValid("serie") && <div className="rm-field-icon"><Check size={16} /></div>}
                    </div>
                </div>
              </div>
            </div>

            {/* COLUMNA 2 */}
            <div className="rm-grid-col">
              <div className="rm-block">
                <h4 className="rm-block-title">Detalles</h4>
                
                <div className={`rm-field required ${isFieldValid("punto_servicio") ? "valid" : ""} ${isFieldInvalid("punto_servicio") ? "invalid" : ""}`}>
                    <label>Municipalidad / Lugar</label>
                    <input type="text" name="punto_servicio" placeholder="Ej: Muni Guate" value={formData.punto_servicio} onChange={handleChange} onBlur={handleBlur} />
                    {isFieldValid("punto_servicio") && <div className="rm-field-icon"><Check size={16} /></div>}
                </div>

                <div className={`rm-field required ${isFieldValid("monto") ? "valid" : ""} ${isFieldInvalid("monto") ? "invalid" : ""}`}>
                    <label>Monto (Q)</label>
                    <input type="text" name="monto" placeholder="0.00" value={formData.monto} onChange={handleChange} onBlur={handleBlur} className="monto-input" />
                    {isFieldValid("monto") && <div className="rm-field-icon"><Check size={16} /></div>}
                </div>

                <div className="rm-field">
                    <label>NIT (Opcional)</label>
                    <input type="text" name="nit_emisor" placeholder="Si aplica" value={formData.nit_emisor} onChange={handleChange} />
                </div>

                <div className={`rm-field required ${isFieldValid("tecnico") ? "valid" : ""} ${isFieldInvalid("tecnico") ? "invalid" : ""}`}>
                  <label>Técnico</label>
                  <input type="text" name="tecnico" value={formData.tecnico} onChange={handleChange} onBlur={handleBlur} />
                </div>

              </div>
            </div>
          </div>

          {errors.submit && <div className="rm-error">{errors.submit}</div>}

          <div className="rm-actions">
            <button type="button" className="rm-btn cancel" onClick={() => navigate("/facturas")}>
              Cancelar
            </button>
            <button type="button" className="rm-btn save" onClick={handleSubmit} disabled={loading}>
              {loading ? "Guardando..." : `Guardar ${formData.tipo === 'PEAJE' ? 'Peaje' : 'Parqueo'}`}
            </button>
          </div>
        </div>
      </div>
      {showToast && <div className="rm-toast"><Check size={20} /> Guardado exitosamente</div>}
    </section>
  );
}