import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import { ArrowLeft, Upload, Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import "./ImportarFactura.css";

export default function ImportarFactura() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [ocrResult, setOcrResult] = useState(null);

  // --- 1. MANEJAR SELECCIÓN DE IMAGEN ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setOcrResult(null);
      setProgress(0);
    }
  };

  // --- 2. FUNCIÓN PRINCIPAL: PROCESAR IMAGEN ---
  const handleProcessImage = async () => {
    if (!image) return;

    setLoading(true);
    setStatusText("Inicializando motor OCR...");

    try {
      const result = await Tesseract.recognize(
        image,
        'spa', 
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setProgress(parseInt(m.progress * 100));
              setStatusText(`Leyendo factura: ${parseInt(m.progress * 100)}%`);
            } else {
              setStatusText("Analizando imagen...");
            }
          },
        }
      );

      const extractedData = parseOCRText(result.data.text);
      
      // CAMBIO AQUÍ: Ya no guardamos 'rawText'. Solo guardamos los datos limpios.
      // Esto asegura que NO se pase texto basura al motivo de la visita.
      setOcrResult(extractedData); 
      
      setStatusText("¡Lectura completada!");

    } catch (error) {
      console.error("Error OCR:", error);
      setStatusText("Error al procesar.");
      alert("No se pudo leer la imagen. Intenta con una foto más clara.");
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  // --- 3. LÓGICA DE DETECCIÓN INTELIGENTE ---
  const parseOCRText = (text) => {
    const data = {
      nit_emisor: "",
      monto: "",
      fecha: "",
      serie: "",
      dte: "",
      // Nota: Tecnico y Motivo se dejan vacíos para ingreso manual
    };

    const fullText = text.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    /* A. SERIE */
    const serieRegex = /(?:SERIE|ERIE|RIE)\s*[:.;]?\s*([A-Z0-9]+)/i;
    const serieMatch = fullText.match(serieRegex);
    if (serieMatch && serieMatch[1]) {
        data.serie = serieMatch[1].replace(/O/g, '0'); 
    }

    /* B. DTE */
    const dteRegex = /(?:NUMERO|NUM|NO\.|DTE)\s*[:.;]?\s*([0-9]+)/i;
    const dteMatch = fullText.match(dteRegex);
    if (dteMatch && dteMatch[1]) {
        data.dte = dteMatch[1];
    }

    /* C. NIT */
    const nitRegex = /NIT\s*[:.;]?\s*([0-9-]{6,15})/i;
    const nitMatch = fullText.match(nitRegex);
    if (nitMatch && nitMatch[1]) {
        data.nit_emisor = nitMatch[1].replace(/\s/g, '');
    }

    /* D. FECHA */
    const dateRegex = /(\d{2}[\/.-]\d{2}[\/.-]\d{4})/;
    const dateMatch = fullText.match(dateRegex);
    if (dateMatch && dateMatch[1]) {
        try {
            const [dia, mes, anio] = dateMatch[1].split(/[\/.-]/);
            data.fecha = `${anio}-${mes}-${dia}`;
        } catch (e) { /* Fallo silencioso */ }
    }

    /* E. MONTO */
    const totalLabelRegex = /(?:TOTAL|PAGAR|VENTA)\s*(?:Q|GTQ)?\s*[:.]?\s*([0-9,]+\.[0-9]{2})/i;
    const totalMatch = fullText.match(totalLabelRegex);

    if (totalMatch && totalMatch[1]) {
        data.monto = totalMatch[1].replace(/,/g, '');
    } else {
        const allPricesRegex = /(?:Q|GTQ)?\s*([0-9,]+\.[0-9]{2})/g;
        const matches = [...fullText.matchAll(allPricesRegex)];
        if (matches.length > 0) {
            const prices = matches.map(m => parseFloat(m[1].replace(/,/g, '')));
            const maxPrice = Math.max(...prices);
            data.monto = maxPrice.toFixed(2);
        }
    }

    return data;
  };

  // --- 4. NAVEGAR ---
  const handleContinue = () => {
    navigate("/nueva-factura", { state: { ocrData: ocrResult } });
  };

  return (
    <section className="if-section">
      <div className="if-container">
        
        <div className="if-header">
          <button onClick={() => navigate("/facturas")} className="if-back-btn">
            <ArrowLeft size={20} /> Volver
          </button>
          <h2 className="if-title">Importar Factura</h2>
        </div>

        <div className="if-card">
          
          <div className="if-upload-zone">
            <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: 'none' }} 
            />
            
            {!image ? (
              <div className="if-placeholder">
                <Camera size={48} className="if-icon-placeholder" />
                <p>Toma una foto clara del recibo</p>
                <button className="if-btn-select" onClick={() => fileInputRef.current.click()}>
                   <Upload size={18} /> Subir Foto
                </button>
              </div>
            ) : (
              <div className="if-preview-container">
                <img src={image} alt="Preview" className="if-image-preview" />
                <button className="if-btn-change" onClick={() => fileInputRef.current.click()}>
                    Cambiar imagen
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="if-progress-container">
              <div className="if-progress-bar">
                <div className="if-progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="if-status-text">
                 <Loader2 size={16} className="spin" /> {statusText}
              </p>
            </div>
          )}

          {image && !loading && !ocrResult && (
             <button className="if-btn-process" onClick={handleProcessImage}>
               🔍 Escanear Datos
             </button>
          )}

          {ocrResult && !loading && (
            <div className="if-results">
              <div className="if-results-header">
                 <CheckCircle size={20} color="#4ade80" />
                 <h3>Lectura Finalizada</h3>
              </div>
              
              <div className="if-detected-fields">
                 <div className="if-field-preview">
                    <label>Serie ("erie"):</label> <span>{ocrResult.serie || "--"}</span>
                 </div>
                 <div className="if-field-preview">
                    <label>DTE (Numero):</label> <span>{ocrResult.dte || "--"}</span>
                 </div>
                 <div className="if-field-preview highlight">
                    <label>Monto:</label> <span>Q {ocrResult.monto || "0.00"}</span>
                 </div>
                 <div className="if-field-preview">
                    <label>NIT:</label> <span>{ocrResult.nit_emisor || "--"}</span>
                 </div>
                 {/* Indicador visual de que estos campos son manuales */}
                 <div className="if-field-preview manual">
                    <label>Técnico/Visita:</label> <span>Manual</span>
                 </div>
              </div>

              <button className="if-btn-continue" onClick={handleContinue}>
                Usar estos datos <ArrowLeft size={18} style={{transform: 'rotate(180deg)'}} />
              </button>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}