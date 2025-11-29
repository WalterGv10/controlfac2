import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, PenTool, UserCheck, User, CreditCard, Upload, Trash2, Building } from "lucide-react";
import "./ConfigurarFirmas.css";

// Definimos los grupos de la corporación
const GRUPOS_TECNOLOGICOS = [
  "CAJEROS AUTOMATICOS",
  "SOPORTE AGENCIAS",
  "COMUNICACIONES WAN",
  "TELEFONIA"
];

export default function ConfigurarFirmas() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Estado inicial
  const [config, setConfig] = useState({
    grupo: "", // Nuevo campo
    tecnico: "",
    coordinador: "",
    secretaria: "",
    cuenta: "",
    firmaImagen: null 
  });

  // 1. Cargar configuración guardada
  useEffect(() => {
    try {
      const guardadas = localStorage.getItem("config_firmas");
      if (guardadas) {
        setConfig(JSON.parse(guardadas));
      }
    } catch (error) {
      console.error("Error cargando config:", error);
    }
  }, []);

  // 2. Manejar cambios en inputs
  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  // 3. Manejar subida de imagen de firma
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) {
        alert("La imagen es muy pesada. Usa una imagen de menos de 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, firmaImagen: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSignature = () => {
    setConfig({ ...config, firmaImagen: null });
  };

  // 4. Guardar
  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("config_firmas", JSON.stringify(config));
      // También actualizamos el user_group global para que NuevaFactura lo detecte
      if(config.grupo) localStorage.setItem("user_group", config.grupo);
      
      setLoading(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 800);
  };

  return (
    <section className="cf-section">
      <div className="cf-container">
        
        {/* HEADER */}
        <div className="cf-header">
          <button onClick={() => navigate("/reportes")} className="cf-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="cf-title-box">
            <h2>Datos de Reembolso</h2>
            <p>Configura tu firma, grupo y cuenta bancaria.</p>
          </div>
        </div>

        {/* GRID PRINCIPAL */}
        <div className="cf-main-grid">
          
          {/* --- TARJETA 1: DATOS PERSONALES --- */}
          <div className="cf-card">
            <h3 className="cf-card-title"><User size={18} /> Información del Solicitante</h3>
            
            {/* SELECCIÓN DE GRUPO */}
            <div className="cf-input-group">
              <label><Building size={14} /> División Tecnológica</label>
              <div className="cf-select-wrapper">
                <select 
                  name="grupo" 
                  value={config.grupo} 
                  onChange={handleChange}
                  className="cf-select"
                >
                  <option value="">-- Selecciona tu área --</option>
                  {GRUPOS_TECNOLOGICOS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="cf-input-group">
              <label>Nombre Técnico</label>
              <input 
                type="text" name="tecnico" value={config.tecnico} onChange={handleChange}
                placeholder="Tu nombre completo"
              />
            </div>

            <div className="cf-row">
              <div className="cf-input-group">
                <label>Coordinador (Revisa)</label>
                <input 
                  type="text" name="coordinador" value={config.coordinador} onChange={handleChange}
                  placeholder="Nombre de tu jefe"
                />
              </div>
              <div className="cf-input-group">
                <label>Secretaria (Vo.Bo.)</label>
                <input 
                  type="text" name="secretaria" value={config.secretaria} onChange={handleChange}
                  placeholder="Administración"
                />
              </div>
            </div>

            <h3 className="cf-card-title mt-4"><CreditCard size={18} /> Datos de Depósito</h3>
            <div className="cf-row">
              {/* SOLO NO. CUENTA (BANCO INDUSTRIAL IMPLÍCITO) */}
              <div className="cf-input-group">
                <label>No. Cuenta (Banco Industrial)</label>
                <input 
                  type="text" name="cuenta" value={config.cuenta} onChange={handleChange}
                  placeholder="Ej: 00-000000-0"
                />
                <small>Única cuenta autorizada para depósitos.</small>
              </div>
            </div>
          </div>

          {/* --- TARJETA 2: FIRMA DIGITAL --- */}
          <div className="cf-card signature-card">
            <h3 className="cf-card-title"><PenTool size={18} /> Tu Firma Digital</h3>
            <p className="cf-desc">Sube una foto clara de tu firma en fondo blanco.</p>

            <div className="cf-signature-area">
              {config.firmaImagen ? (
                <div className="cf-sig-preview-box">
                  <img src={config.firmaImagen} alt="Firma" className="cf-sig-img" />
                  <button onClick={removeSignature} className="cf-btn-remove">
                    <Trash2 size={16} /> Borrar
                  </button>
                </div>
              ) : (
                <div 
                  className="cf-upload-placeholder"
                  onClick={() => fileInputRef.current.click()}
                >
                  <Upload size={32} />
                  <span>Toca para subir firma</span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>
          </div>

        </div>

        {/* ACCIONES */}
        <div className="cf-actions">
            <button className="cf-btn-save" onClick={handleSave} disabled={loading}>
              {loading ? "Guardando..." : (
                <> <Save size={18} /> Guardar Perfil de Cobro </>
              )}
            </button>
        </div>

        {/* VISTA PREVIA FOOTER PDF */}
        <div className="cf-preview-footer">
          <h3>Vista Previa (Pie de Página PDF)</h3>
          <div className="cf-footer-row">
            <div className="footer-block">
               <div className="footer-sig-space">
                 {config.firmaImagen && <img src={config.firmaImagen} alt="Firma" />}
               </div>
               <div className="footer-line"></div>
               <span className="footer-name">{config.tecnico || "Técnico"}</span>
               <span className="footer-meta">
                  {config.grupo || "Área"} <br/>
                  Cta: BI - {config.cuenta || "000..."}
               </span>
            </div>
            
            <div className="footer-block">
               <div className="footer-sig-space"></div>
               <div className="footer-line"></div>
               <span className="footer-name">{config.coordinador || "Jefe"}</span>
               <span className="footer-meta">Revisado por</span>
            </div>

            <div className="footer-block">
               <div className="footer-sig-space"></div>
               <div className="footer-line"></div>
               <span className="footer-name">{config.secretaria || "Admin"}</span>
               <span className="footer-meta">Vo.Bo.</span>
            </div>
          </div>
        </div>

      </div>

      {showToast && (
        <div className="cf-toast">
          ✅ Datos guardados correctamente
        </div>
      )}
    </section>
  );
}