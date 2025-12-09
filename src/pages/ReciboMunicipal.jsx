import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { 
  Check, 
  X, 
  AlertCircle, 
  Building, 
  User, 
  MapPin, 
  Car, 
  Ticket, 
  FileText, 
  Camera, 
  Trash2,
  Loader2,
  Save,
  Hash
} from "lucide-react";
import logo from "../assets/logo.png";
import "./ReciboMunicipal.css";

export default function ReciboMunicipal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const fileInputRef = useRef(null);

  /* ----------------------------------------
   * ESTADO INICIAL
   * ---------------------------------------- */
  const initialState = {
    tipo: "PARQUEO",
    fecha: new Date().toISOString().split("T")[0],
    nit_emisor: "",
    serie: "",            // Número de Recibo
    dte: "TICKET",        // Valor fijo interno
    
    // CAMPOS ESPECÍFICOS
    municipalidad: "",    // 🟢 Se guarda en columna 'municipalidad'
    punto_servicio: "",   // 🟢 Se guarda en columna 'punto_servicio'
    motivo_visita: "",    // 🟢 Se guarda en columna 'motivo_visita'

    tecnico: "",
    grupo: "",            // Auto-llenado
    monto: "",
    estado: "Pendiente",
    imagen_url: ""
  };

  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showToast, setShowToast] = useState(false);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  /* ----------------------------------------
   * 1. DETECTAR DATOS AUTO (PERFIL)
   * ---------------------------------------- */
  useEffect(() => {
    const newData = {};
    let dataChanged = false;

    // A. Grupo de Trabajo (desde Perfil/LocalStorage)
    const userGroup = localStorage.getItem("user_group");
    if (userGroup) {
      newData.grupo = userGroup;
      dataChanged = true;
    }

    // B. Nombre del Técnico (desde Configurar Firmas)
    const configFirmas = localStorage.getItem("config_firmas");
    if (configFirmas) {
      try {
        const parsed = JSON.parse(configFirmas);
        if (parsed.tecnico) {
          newData.tecnico = parsed.tecnico;
          dataChanged = true;
        }
      } catch (e) { console.error(e); }
    }

    // C. Intentar cargar desde Supabase si no hay datos locales
    if (session?.user && (!newData.grupo || !newData.tecnico)) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("perfiles")
          .select("nombre_tecnico, grupo_tecnico")
          .eq("id", session.user.id)
          .single();
        
        if (data) {
          setFormData(prev => ({
            ...prev,
            tecnico: data.nombre_tecnico || prev.tecnico,
            grupo: data.grupo_tecnico || prev.grupo,
            ...newData // Prioridad a lo local si existe
          }));
        } else if (dataChanged) {
          setFormData(prev => ({ ...prev, ...newData }));
        }
      };
      fetchProfile();
    } else if (dataChanged) {
      setFormData(prev => ({ ...prev, ...newData }));
    }
  }, [session]);

  /* ----------------------------------------
   * VALIDACIONES
   * ---------------------------------------- */
  const validate = (name, value) => {
    let error = "";

    switch (name) {
      case "municipalidad":
        if (!value.trim()) error = "Requerido (Entidad)";
        break;
      case "punto_servicio":
        if (!value.trim()) error = "Requerido (Lugar exacto)";
        break;
      case "motivo_visita":
        if (!value.trim()) error = "Requerido (Justificación)";
        break;
      case "serie":
        if (!value) error = "Requerido";
        else if (value.length > 20) error = "Máx 20 caracteres";
        break;
      case "monto":
        if (value && !/^\d+(\.\d{1,2})?$/.test(value)) {
          error = "Monto inválido (Ej: 15.00)";
        }
        break;
      case "fecha":
        const f = new Date(value);
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        if (f > hoy) error = "La fecha no puede ser futura";
        break;
      default:
        break;
    }
    return error;
  };

  /* ----------------------------------------
   * FORMATEO AUTOMÁTICO
   * ---------------------------------------- */
  const formatValue = (name, value) => {
    switch (name) {
      case "nit_emisor":
      case "serie":
      case "municipalidad":
        return value.toUpperCase();
      case "monto":
        return value.replace(/[^0-9.]/g, "");
      default:
        return value;
    }
  };

  /* ----------------------------------------
   * MANEJO DE IMAGEN
   * ---------------------------------------- */
  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCompressing(true);
    // Simulación breve de proceso
    setTimeout(() => {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setCompressing(false);
    }, 600);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ----------------------------------------
   * HANDLERS DE FORMULARIO
   * ---------------------------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    const formatted = formatValue(name, value);
    const error = validate(name, formatted);

    setFormData({ ...formData, [name]: formatted });
    setErrors({ ...errors, [name]: error });
  };

  const handleBlur = (e) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  /* ----------------------------------------
   * SUBMIT
   * ---------------------------------------- */
  const handleSubmit = async () => {
    const newErrors = {};
    const newTouched = {};

    // Campos obligatorios específicos para Recibo
    const requiredFields = ["municipalidad", "punto_servicio", "motivo_visita", "monto", "serie", "tecnico"];

    requiredFields.forEach((key) => {
      newTouched[key] = true;
      if (!formData[key]) {
        newErrors[key] = "Campo requerido";
      } else {
        const error = validate(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);

    try {
      // 1. Subir Imagen (Si existe)
      let finalUrl = "";
      if (imageFile) {
        const path = `recibos/${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
        const { error: upErr } = await supabase.storage.from('comprobantes').upload(path, imageFile);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from('comprobantes').getPublicUrl(path);
        finalUrl = data.publicUrl;
      }

      // 2. Insertar en Base de Datos
      const payload = {
        ...formData,
        imagen_url: finalUrl
      };

      const { error: insertError } = await supabase.from("facturas").insert([payload]);
      if (insertError) throw insertError;

      setShowToast(true);
      setTimeout(() => navigate("/facturas"), 2000);

    } catch (err) {
      setErrors({ submit: "❌ Error al guardar: " + err.message });
      setLoading(false);
    }
  };

  const isFieldValid = (name) => touched[name] && !errors[name] && formData[name];
  const isFieldInvalid = (name) => touched[name] && errors[name];

  return (
    <section className="rcm-section">
      <div className="rcm-card">
        <button className="rcm-close" onClick={() => navigate("/facturas")} aria-label="Cerrar">
          <X size={20} />
        </button>

        <h2 className="rcm-title">
          <img src={logo} alt="logo" className="rcm-logo-img" />
          Recibo Municipal
        </h2>

        {/* INFO AUTO (GRUPO Y TÉCNICO) */}
        <div className="rcm-auto-info">
          {formData.grupo && (
            <div className="rcm-badge">
              <Building size={14} /> <span>{formData.grupo}</span>
            </div>
          )}
          {formData.tecnico && (
            <div className="rcm-badge">
              <User size={14} /> <span>{formData.tecnico}</span>
            </div>
          )}
        </div>

        {/* SELECTOR TIPO */}
        <div className="rcm-type-selector">
          <button 
            className={`type-btn ${formData.tipo === 'PARQUEO' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, tipo: 'PARQUEO'})}
          >
            <Car size={18} /> Parqueo
          </button>
          <button 
            className={`type-btn ${formData.tipo === 'PEAJE' ? 'active' : ''}`}
            onClick={() => setFormData({...formData, tipo: 'PEAJE'})}
          >
            <Ticket size={18} /> Peaje
          </button>
        </div>

        <div className="rcm-form">
          <div className="rcm-grid-layout">
            
            {/* COLUMNA 1: DATOS GENERALES */}
            <div className="rcm-col">
              <h4 className="rcm-subtitle">📝 Información del Servicio</h4>
              
              <div className="rcm-field-group">
                
                {/* 1. MUNICIPALIDAD */}
                <div className={`rcm-field required ${isFieldValid("municipalidad") ? "valid" : ""} ${isFieldInvalid("municipalidad") ? "invalid" : ""}`}>
                   <label>Municipalidad (Entidad)</label>
                   <div className="rcm-input-icon">
                     <Building size={16} className="icon-left" />
                     <input 
                        type="text" 
                        name="municipalidad" 
                        placeholder="Ej: Muni de Villa Nueva" 
                        value={formData.municipalidad}
                        onChange={handleChange}
                        onBlur={handleBlur}
                     />
                   </div>
                   {isFieldValid("municipalidad") && <div className="rcm-check-icon"><Check size={16}/></div>}
                   {isFieldInvalid("municipalidad") && <span className="error-msg">{errors.municipalidad}</span>}
                </div>

                {/* 2. PUNTO DE SERVICIO */}
                <div className={`rcm-field required ${isFieldValid("punto_servicio") ? "valid" : ""} ${isFieldInvalid("punto_servicio") ? "invalid" : ""}`}>
                   <label>Punto de Servicio (Lugar)</label>
                   <div className="rcm-input-icon">
                     <MapPin size={16} className="icon-left" />
                     <input 
                        type="text" 
                        name="punto_servicio" 
                        placeholder="Ej: CXXX / AXXX" 
                        value={formData.punto_servicio}
                        onChange={handleChange}
                        onBlur={handleBlur}
                     />
                   </div>
                   {isFieldValid("punto_servicio") && <div className="rcm-check-icon"><Check size={16}/></div>}
                   {isFieldInvalid("punto_servicio") && <span className="error-msg">{errors.punto_servicio}</span>}
                </div>

                {/* 3. MOTIVO */}
                <div className={`rcm-field required ${isFieldValid("motivo_visita") ? "valid" : ""} ${isFieldInvalid("motivo_visita") ? "invalid" : ""}`}>
                   <label>Motivo de la Visita</label>
                   <div className="rcm-input-icon">
                     <FileText size={16} className="icon-left" />
                     <textarea 
                        name="motivo_visita" 
                        rows="2"
                        placeholder="" 
                        value={formData.motivo_visita}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="rcm-textarea"
                     />
                   </div>
                   {isFieldInvalid("motivo_visita") && <span className="error-msg">{errors.motivo_visita}</span>}
                </div>

                {/* FILA: NIT + SERIE */}
                <div className="rcm-row-2">
                    <div className="rcm-field">
                       <label>NIT (Opcional)</label>
                       <div className="rcm-input-icon">
                         <Hash size={16} className="icon-left" />
                         <input 
                            type="text" 
                            name="nit_emisor" 
                            placeholder="C/F" 
                            value={formData.nit_emisor}
                            onChange={handleChange}
                         />
                       </div>
                    </div>

                    <div className={`rcm-field required ${isFieldValid("serie") ? "valid" : ""} ${isFieldInvalid("serie") ? "invalid" : ""}`}>
                        <label>No. Recibo / Ticket</label>
                        <input 
                            type="text" 
                            name="serie" 
                            placeholder="#12345" 
                            value={formData.serie}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />
                    </div>
                </div>

              </div>
            </div>

            {/* COLUMNA 2: DETALLES FINANCIEROS Y FOTO */}
            <div className="rcm-col">
              <h4 className="rcm-subtitle">📸 Evidencia y Costo</h4>
              
              <div className="rcm-field-group">
                  <div className={`rcm-field required ${isFieldValid("tecnico") ? "valid" : ""} ${isFieldInvalid("tecnico") ? "invalid" : ""}`}>
                    <label>Técnico</label>
                    <div className="rcm-input-icon">
                       <User size={16} className="icon-left" />
                       <input 
                          type="text" 
                          name="tecnico" 
                          value={formData.tecnico} 
                          onChange={handleChange} 
                          onBlur={handleBlur} 
                       />
                    </div>
                    {isFieldValid("tecnico") && <div className="rcm-check-icon"><Check size={16}/></div>}
                  </div>

                  <div className="rcm-field">
                      <label>Fecha</label>
                      <input 
                          type="date" 
                          name="fecha" 
                          value={formData.fecha} 
                          onChange={handleChange} 
                      />
                  </div>

                  <div className={`rcm-field required highlight ${isFieldValid("monto") ? "valid" : ""} ${isFieldInvalid("monto") ? "invalid" : ""}`}>
                     <label>Monto Total (Q)</label>
                     <input 
                        type="number" 
                        name="monto" 
                        placeholder="0.00" 
                        value={formData.monto} 
                        onChange={handleChange} 
                        onBlur={handleBlur} 
                     />
                     {isFieldInvalid("monto") && <small className="error-text-center">Ingrese un monto válido</small>}
                  </div>

                  <div className="rcm-photo-zone">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      accept="image/*" 
                      onChange={handleImageSelect} 
                      style={{ display: 'none' }} 
                    />

                    {!imagePreview ? (
                      <div className="rcm-upload-placeholder" onClick={() => !compressing && fileInputRef.current.click()}>
                        {compressing ? (
                          <><Loader2 size={32} className="spin" /><span>Procesando...</span></>
                        ) : (
                          <><Camera size={32} /><span>Foto del Ticket</span></>
                        )}
                      </div>
                    ) : (
                      <div className="rcm-image-preview-box">
                        <img src={imagePreview} alt="Recibo" />
                        <button className="rcm-remove-img" onClick={removeImage}>
                          <Trash2 size={16} />
                        </button>
                        <div className="rcm-img-badge"><Check size={12} /> Listo</div>
                      </div>
                    )}
                  </div>
              </div>

            </div>
          </div>

          {errors.submit && <div className="rcm-error">{errors.submit}</div>}

          <div className="rcm-actions">
            <button type="button" className="rcm-btn cancel" onClick={() => navigate("/facturas")}>
              Cancelar
            </button>
            <button type="button" className="rcm-btn save" onClick={handleSubmit} disabled={loading || compressing}>
              {loading ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
              <span>{loading ? "Guardando..." : "Guardar Recibo"}</span>
            </button>
          </div>
        </div>
      </div>

      {showToast && (
         <div className="rcm-toast">
            <Check size={20} /> ¡Recibo guardado correctamente!
         </div>
      )}
    </section>
  );
}