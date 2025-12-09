import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Check, X, AlertCircle, Building, User } from "lucide-react";
import logo from "../assets/logo.png";
import "./NuevaFactura.css";

export default function NuevaFactura() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para recibir datos de navegación (OCR)

  /* ----------------------------------------
   * ESTADO INICIAL
   * ---------------------------------------- */
  const initialState = {
    fecha: new Date().toISOString().split("T")[0],
    nit_emisor: "",
    serie: "",
    dte: "",
    punto_servicio: "",
    tecnico: "",
    grupo: "", // Se llenará auto desde Perfil
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
   * 1. DETECTAR DATOS AUTO (PERFIL/FIRMAS)
   * ---------------------------------------- */
  useEffect(() => {
    const newData = {};
    let dataChanged = false;

    // A. Grupo de Trabajo (desde Perfil)
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

    if (dataChanged) {
      setFormData(prev => ({ ...prev, ...newData }));
    }
  }, []);

  /* ----------------------------------------
   * 2. DETECTAR DATOS DE OCR (SI EXISTEN)
   * ---------------------------------------- */
  useEffect(() => {
    // Si venimos de la pantalla "Importar" con datos detectados:
    if (location.state?.ocrData) {
       const ocr = location.state.ocrData;
       
       setFormData(prev => ({
         ...prev,
         // Usamos los datos del OCR si existen, si no, dejamos lo que estaba
         nit_emisor: ocr.nit_emisor || prev.nit_emisor,
         monto: ocr.monto || prev.monto,
         fecha: ocr.fecha || prev.fecha,
         dte: ocr.dte || prev.dte,
         serie: ocr.serie || prev.serie,
         
         // 🧹 LIMPIEZA TOTAL: Forzamos cadena vacía explícitamente.
         // Esto elimina cualquier texto tipo "[OCR Detectado]..."
         motivo_visita: "" 
       }));

       // Mostrar notificación visual
       setShowToast(true); 
    }
  }, [location]);

  /* ----------------------------------------
   * VALIDACIONES
   * ---------------------------------------- */
  const validate = (name, value) => {
    let error = "";

    switch (name) {
      case "nit_emisor":
        // Permitimos vacio temporalmente mientras escriben, pero validamos formato
        if (value && !/^\d{7,10}-?\w?$/.test(value)) { 
          // Regex un poco más permisiva para NITs de Guatemala
          error = "NIT inválido (ej: 12345678-9)";
        }
        break;

      case "serie":
        if (value && value.length > 20) error = "Máximo 20 caracteres";
        break;

      case "dte":
        if (value && !/^[A-Z0-9-]+$/.test(value)) {
          error = "Solo letras mayúsculas, números y guiones";
        }
        break;

      case "fecha":
        const f = new Date(value);
        const hoy = new Date();
        // Ajustamos para permitir el día de hoy sin problemas de hora
        hoy.setHours(23, 59, 59, 999); 
        if (f > hoy) error = "La fecha no puede ser futura";
        break;

      case "monto":
        if (value && !/^\d+(\.\d{1,2})?$/.test(value)) {
          error = "Monto inválido (Ej: 125.50)";
        }
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
        const nums = value.replace(/[^0-9kK]/g, "").toUpperCase(); // Acepta K para casos especiales
        // Formato simple X-Y si tiene longitud suficiente
        if (nums.length > 8 && !nums.includes('-')) {
             return nums.slice(0, nums.length - 1) + "-" + nums.slice(nums.length - 1);
        }
        return nums;

      case "dte":
      case "serie":
        return value.toUpperCase();

      case "monto":
        return value.replace(/[^0-9.]/g, "");

      default:
        return value;
    }
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

  const handleStatusChange = (newStatus) => {
    setFormData({ ...formData, estado: newStatus });
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

    Object.keys(formData).forEach((key) => {
      newTouched[key] = true;
      // Validar campos obligatorios básicos (DTE y SERIE pueden ser opcionales en borradores, ajusta si es necesario)
      if (!formData[key] && key !== 'serie' && key !== 'dte') { 
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
      const { error: insertError } = await supabase.from("facturas").insert([formData]);
      if (insertError) throw insertError;

      setShowToast(true);

      setTimeout(() => navigate("/facturas"), 2000);
    } catch (err) {
      setErrors({ submit: "❌ Error al guardar: " + err.message });
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (e.target.tagName !== "TEXTAREA") handleSubmit();
    }
  };

  /* ----------------------------------------
   * UTILS DE ESTADO VISUAL
   * ---------------------------------------- */
  const isFieldValid = (name) => touched[name] && !errors[name] && formData[name];
  const isFieldInvalid = (name) => touched[name] && errors[name];

  /* ----------------------------------------
   * RENDER
   * ---------------------------------------- */
  return (
    <section className="nf-section">
      <div className="nf-card">
        <button className="nf-close" onClick={() => navigate("/facturas")} aria-label="Cerrar">
          <X size={20} />
        </button>

        <h2 className="nf-title">
          <img src={logo} alt="logo" className="nf-title-logo" />
          Guarda Nueva Factura
        </h2>

        {/* --- INFO AUTOMÁTICA (GRUPO Y TÉCNICO) --- */}
        <div className="nf-auto-info">
          {formData.grupo && (
            <div className="nf-badge">
              <Building size={14} /> 
              <span>{formData.grupo}</span>
            </div>
          )}
          {formData.tecnico && (
            <div className="nf-badge">
              <User size={14} /> 
              <span>{formData.tecnico}</span>
            </div>
          )}
        </div>

        {location.state?.ocrData && (
            <div className="nf-ocr-badge">
                 ✨ Datos autocompletados por OCR
            </div>
        )}

        <div className="nf-form" onKeyPress={handleKeyPress}>
          <div className="nf-main-grid">

            {/* -------- COLUMNA 1 -------- */}
            <div className="nf-grid-col">
              <div className="nf-block">
                <h4 className="nf-block-title">📋 Datos Generales</h4>

                <div className="nf-field" style={{ marginBottom: "1rem" }}>
                  <label>Estado de la Factura</label>
                  <div className="nf-status-row">
                    <button
                      type="button"
                      className={`nf-status-btn pending ${formData.estado === "Pendiente" ? "active" : ""}`}
                      onClick={() => handleStatusChange("Pendiente")}
                    >
                      ⏳ Pendiente
                    </button>

                    <button
                      type="button"
                      className={`nf-status-btn paid ${formData.estado === "Pagada" ? "active" : ""}`}
                      onClick={() => handleStatusChange("Pagada")}
                    >
                      💵 Pagada
                    </button>
                  </div>
                </div>

                {/* FILA 1 */}
                <div className="nf-row">

                  {/* FECHA */}
                  <div className={`nf-field required ${isFieldValid("fecha") ? "valid" : ""} ${isFieldInvalid("fecha") ? "invalid" : ""}`}>
                    <label htmlFor="fecha">Fecha</label>
                    <input
                      id="fecha"
                      type="date"
                      name="fecha"
                      value={formData.fecha}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {isFieldValid("fecha") && <div className="nf-field-icon"><Check size={16} /></div>}
                    {isFieldInvalid("fecha") && (
                      <>
                        <div className="nf-field-icon"><X size={16} /></div>
                        <div className="nf-field-error"><AlertCircle size={12} /> {errors.fecha}</div>
                      </>
                    )}
                  </div>

                  {/* SERIE */}
                  <div className={`nf-field required ${isFieldValid("serie") ? "valid" : ""} ${isFieldInvalid("serie") ? "invalid" : ""}`}>
                    <label htmlFor="serie">Serie</label>
                    <input
                      id="serie"
                      type="text"
                      name="serie"
                      placeholder="Ej: 2D22F3D33"
                      value={formData.serie}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {isFieldValid("serie") && <div className="nf-field-icon"><Check size={16} /></div>}
                    {isFieldInvalid("serie") && (
                      <>
                        <div className="nf-field-icon"><X size={16} /></div>
                        <div className="nf-field-error"><AlertCircle size={12} /> {errors.serie}</div>
                      </>
                    )}
                  </div>

                </div>

                {/* FILA 2 */}
                <div className="nf-row">

                  {/* DTE */}
                  <div className={`nf-field required ${isFieldValid("dte") ? "valid" : ""} ${isFieldInvalid("dte") ? "invalid" : ""}`}>
                    <label htmlFor="dte">Numero DTE</label>
                    <input
                      id="dte"
                      type="text"
                      name="dte"
                      placeholder="Ej: 12345556"
                      value={formData.dte}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {isFieldValid("dte") && <div className="nf-field-icon"><Check size={16} /></div>}
                    {isFieldInvalid("dte") && (
                      <>
                        <div className="nf-field-icon"><X size={16} /></div>
                        <div className="nf-field-error"><AlertCircle size={12} /> {errors.dte}</div>
                      </>
                    )}
                  </div>

                  {/* PUNTO DE SERVICIO */}
                  <div className={`nf-field required ${isFieldValid("punto_servicio") ? "valid" : ""} ${isFieldInvalid("punto_servicio") ? "invalid" : ""}`}>
                    <label htmlFor="punto_servicio">Punto de Servicio</label>
                    <input
                      id="punto_servicio"
                      type="text"
                      name="punto_servicio"
                      placeholder="Ej: CXXX"
                      value={formData.punto_servicio}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    {isFieldValid("punto_servicio") && <div className="nf-field-icon"><Check size={16} /></div>}
                    {isFieldInvalid("punto_servicio") && (
                      <>
                        <div className="nf-field-icon"><X size={16} /></div>
                        <div className="nf-field-error"><AlertCircle size={12} /> {errors.punto_servicio}</div>
                      </>
                    )}
                  </div>

                </div>

                {/* FILA 3 → MONTO */}
                <div className="nf-row">

                  <div className={`nf-field required ${isFieldValid("monto") ? "valid" : ""} ${isFieldInvalid("monto") ? "invalid" : ""}`}>
                    <label htmlFor="monto">Monto de la Factura (Q)</label>
                    <input
                      id="monto"
                      type="text"
                      name="monto"
                      placeholder="Ej: 125.50"
                      value={formData.monto}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      style={location.state?.ocrData ? {borderColor: '#00ffc8', boxShadow: '0 0 5px rgba(0,255,200,0.5)'} : {}}
                    />
                    {isFieldValid("monto") && <div className="nf-field-icon"><Check size={16} /></div>}
                    {isFieldInvalid("monto") && (
                      <>
                        <div className="nf-field-icon"><X size={16} /></div>
                        <div className="nf-field-error"><AlertCircle size={12} /> {errors.monto}</div>
                      </>
                    )}
                  </div>

                </div>
              </div>
            </div>

            {/* -------- COLUMNA 2 -------- */}
            <div className="nf-grid-col">

              <div className="nf-block">
                
                {/* NIT EMISOR */}
                <div className={`nf-field required ${isFieldValid("nit_emisor") ? "valid" : ""} ${isFieldInvalid("nit_emisor") ? "invalid" : ""}`}>
                  <label htmlFor="nit_emisor">NIT Emisor</label>
                  <input
                    id="nit_emisor"
                    type="text"
                    name="nit_emisor"
                    placeholder="123456789"
                    value={formData.nit_emisor}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    maxLength="15"
                  />
                  {isFieldValid("nit_emisor") && <div className="nf-field-icon"><Check size={16} /></div>}
                  {isFieldInvalid("nit_emisor") && (
                    <>
                      <div className="nf-field-icon"><X size={16} /></div>
                      <div className="nf-field-error"><AlertCircle size={12} /> {errors.nit_emisor}</div>
                    </>
                  )}
                </div>

                {/* TÉCNICO */}
                <div className={`nf-field required ${isFieldValid("tecnico") ? "valid" : ""} ${isFieldInvalid("tecnico") ? "invalid" : ""}`}>
                  <label htmlFor="tecnico">Técnico</label>
                  <input
                    id="tecnico"
                    type="text"
                    name="tecnico"
                    placeholder="Nombre del técnico"
                    value={formData.tecnico}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {isFieldValid("tecnico") && <div className="nf-field-icon"><Check size={16} /></div>}
                  {isFieldInvalid("tecnico") && (
                    <>
                      <div className="nf-field-icon"><X size={16} /></div>
                      <div className="nf-field-error"><AlertCircle size={12} /> {errors.tecnico}</div>
                    </>
                  )}
                </div>
              </div>

              {/* MOTIVO DE VISITA */}
              <div className="nf-block">
                <div className={`nf-field required ${isFieldValid("motivo_visita") ? "valid" : ""} ${isFieldInvalid("motivo_visita") ? "invalid" : ""}`}>
                  <label htmlFor="motivo_visita">Motivo de la Visita</label>
                  
                  <textarea
                    id="motivo_visita"
                    name="motivo_visita"
                    rows="3"
                    placeholder="Describe el motivo..."
                    value={formData.motivo_visita}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />

                  {isFieldValid("motivo_visita") && <div className="nf-field-icon"><Check size={16} /></div>}
                  {isFieldInvalid("motivo_visita") && (
                    <>
                      <div className="nf-field-icon"><X size={16} /></div>
                      <div className="nf-field-error"><AlertCircle size={12} /> {errors.motivo_visita}</div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>

          {errors.submit && <div className="nf-error">{errors.submit}</div>}

          <div className="nf-actions">
            <button type="button" className="nf-btn cancel" onClick={() => navigate("/facturas")}>
              Cancelar
            </button>

            <button type="button" className="nf-btn save" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <div className="nf-spinner" /> Guardando...
                </>
              ) : (
                <>
                  <Check size={18} /> Guardar Factura
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {showToast && (
        <div className="nf-toast">
          <Check size={20} /> 
          {location.state?.ocrData ? "¡Datos importados guardados!" : "¡Factura guardada exitosamente!"}
        </div>
      )}
    </section>
  );
}