import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; // 👈 IMPORTANTE: Cliente BD
import { useAuth } from "../context/AuthContext"; // 👈 IMPORTANTE: Usuario
import { ArrowLeft, Save, PenTool, User, CreditCard, Upload, Trash2, Building } from "lucide-react";
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
  const { session } = useAuth(); // Obtenemos la sesión del usuario actual
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Estado inicial
  const [config, setConfig] = useState({
    grupo: "", 
    tecnico: "",
    coordinador: "",
    secretaria: "",
    cuenta: "",
    firmaImagen: null 
  });

  // 1. Cargar configuración desde SUPABASE (Nube)
  useEffect(() => {
    if (session?.user) {
      cargarPerfil();
    }
  }, [session]);

  const cargarPerfil = async () => {
    try {
      setLoading(true);
      const { user } = session;

      // Consultamos la tabla 'perfiles'
      let { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        // Rellenamos el estado con los datos que vienen de la BD
        setConfig({
          grupo: data.grupo_tecnico || "",
          tecnico: data.nombre_tecnico || "",
          coordinador: data.nombre_coordinador || "",
          secretaria: data.nombre_secretaria || "",
          cuenta: data.numero_cuenta || "",
          firmaImagen: data.firma_digital || null
        });
        
        // Guardamos copia local para velocidad
        localStorage.setItem("user_group", data.grupo_tecnico || "");
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setLoading(false);
    }
  };

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

  // 4. Guardar en SUPABASE (Base de Datos)
  const handleSave = async () => {
    if (!session?.user) {
        alert("No hay sesión activa. Por favor inicia sesión de nuevo.");
        return;
    }
    
    setLoading(true);

    try {
      // Preparamos el objeto con los nombres de columnas de la BD
      const updates = {
        id: session.user.id,
        grupo_tecnico: config.grupo,
        nombre_tecnico: config.tecnico,
        nombre_coordinador: config.coordinador,
        nombre_secretaria: config.secretaria,
        numero_cuenta: config.cuenta,
        firma_digital: config.firmaImagen, // Se guarda en Base64
        updated_at: new Date(),
      };

      // Enviamos a la tabla 'perfiles'
      let { error } = await supabase
        .from('perfiles')
        .upsert(updates);

      if (error) throw error;

      // Actualizamos localStorage también por redundancia
      localStorage.setItem("config_firmas", JSON.stringify(config));
      if(config.grupo) localStorage.setItem("user_group", config.grupo);
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar en la nube: " + error.message);
    } finally {
      setLoading(false);
    }
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
              {loading ? "Guardando en Nube..." : (
                <> <Save size={18} /> Guardar Perfil </>
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
          ✅ Datos guardados y sincronizados
        </div>
      )}
    </section>
  );
}