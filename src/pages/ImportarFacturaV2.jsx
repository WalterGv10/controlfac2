import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import {
  ArrowLeft, Camera, Upload, Loader2,
  Edit2, RotateCcw, ZoomIn, ZoomOut,
  ScanText, AlertTriangle, FileSearch, Save, Eye
} from "lucide-react";
import "./ImportarFacturaV2.css";

export default function ImportarFacturaV2() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // --- ESTADOS ---
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  
  // Datos OCR
  const [ocrData, setOcrData] = useState(null);
  const [debugText, setDebugText] = useState("");

  // Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Cleanup de memoria
  useEffect(() => {
    return () => { if (image) URL.revokeObjectURL(image); };
  }, [image]);

  // 1. CARGA DE IMAGEN (Sin filtros, directa)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (image) URL.revokeObjectURL(image);
      const url = URL.createObjectURL(file);
      setImage(url);
      setOcrData(null);
      setProgress(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // 2. PROCESAMIENTO OCR (Tesseract Puro)
  const handleProcess = async () => {
    if (!image) return;
    setLoading(true);
    setStatusText("Iniciando motor de lectura...");

    try {
      const result = await Tesseract.recognize(
        image,
        'spa', // Español
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setStatusText(`Analizando documento: ${Math.round(m.progress * 100)}%`);
              setProgress(Math.round(m.progress * 100));
            }
          },
          // PSM 6: Asume un bloque de texto uniforme (mejor para facturas)
          tessedit_pageseg_mode: '6',
        }
      );

      setDebugText(result.data.text); // Guardamos texto crudo para depuración
      const extractedData = parseInvoiceRules(result.data.text);
      setOcrData(extractedData);

    } catch (error) {
      console.error(error);
      alert("Error al procesar. Intenta con una imagen más clara.");
    } finally {
      setLoading(false);
    }
  };

  // ========================================================================
  // 3. MOTOR DE REGLAS DE NEGOCIO (EL CEREBRO V2)
  // ========================================================================
  const parseInvoiceRules = (text) => {
    // Normalizamos saltos de línea y creamos versiones del texto
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const fullTextUpper = text.toUpperCase();
    
    // Objeto resultado
    const data = {
      serie: "",
      dte: "",
      nit_emisor: "",
      monto: "",
      fecha: "",
      rawLines: lines
    };

    // --- REGLA 1: NIT DEL EMISOR (Prioridad: Primeras 10 líneas) ---
    // Buscamos variaciones: NIT:, N.I.T.:, NlT (error OCR común)
    const headerLines = lines.slice(0, 15); 
    const nitRegex = /(?:NIT|N\.I\.T\.|N\.l\.T\.|NlT)\s*[:.;-]?\s*([0-9Kk-]{5,20})/i;

    for (let line of headerLines) {
        const match = line.match(nitRegex);
        if (match) {
            // Limpieza: Quitamos espacios
            data.nit_emisor = match[1].replace(/\s/g, '').toUpperCase();
            break; 
        }
    }

    // --- REGLA 2: SERIE (Búsqueda Difusa) ---
    // Patrones: "Serie:", "SERIE:", "erie:", "ERIE:", "Serle"
    const serieRegex = /(?:SERIE|ERIE|SR|SERLE|SER1E)\s*[:.;]?\s*([A-Z0-9-]{1,15})/i;
    const serieMatch = fullTextUpper.match(serieRegex);
    if (serieMatch) {
        data.serie = serieMatch[1].replace(/[^A-Z0-9]/g, '');
    }

    // --- REGLA 3: NUMERO DTE (Patrones Específicos) ---
    // Patrones: "Numero:", "Num:", "umero:", "Numero DTE", "Numero de DTE:"
    // Nota: 'umero' cubre el caso donde la 'N' no se leyó bien.
    
    // Primero buscamos "NO:" explícito (ej: "FACTURA NO: 12345")
    const dteNoRegex = /(?:NO\.|NO:|N°)\s*[:.;]?\s*([0-9-]{5,25})/i;
    const noMatch = fullTextUpper.match(dteNoRegex);

    if (noMatch) {
        data.dte = noMatch[1].replace(/[^0-9]/g, '');
    } else {
        // Si no, buscamos "Numero", "Num", "umero", "DTE"
        const dteGenRegex = /(?:NUMERO|NUM|UMERO|DTE)\s*(?:DE)?\s*(?:DTE)?\s*[:.;]?\s*([0-9-]{5,25})/i;
        const genMatch = fullTextUpper.match(dteGenRegex);
        
        if (genMatch) {
            data.dte = genMatch[1].replace(/[^0-9]/g, '');
        }
    }

    // --- REGLA 4: MONTO (Búsqueda del Mayor Valor Lógico) ---
    // Buscamos "TOTAL" explícitamente primero
    const totalRegex = /(?:TOTAL|PAGAR|VENTA|EFECTIVO)\s*(?:Q|GTQ)?\s*[:.]?\s*([0-9,]+\.[0-9]{2})/i;
    const totalMatch = fullTextUpper.match(totalRegex);

    if (totalMatch) {
        data.monto = cleanMonto(totalMatch[1]);
    } else {
        // Estrategia de respaldo: Buscar todos los patrones de dinero y tomar el mayor
        // Excluyendo años como 2024, 2025 que suelen confundirse con precios
        const moneyPattern = /(?:Q|GTQ)?\s*([0-9,]+\.[0-9]{2})/g;
        const allMoney = [...fullTextUpper.matchAll(moneyPattern)];
        
        if (allMoney.length > 0) {
            const values = allMoney.map(m => parseFloat(cleanMonto(m[1])));
            const validValues = values.filter(v => 
                v > 0 && 
                v < 50000 && // Tope lógico para caja chica
                ![2023, 2024, 2025].includes(v) // No es un año
            );
            
            if (validValues.length > 0) {
                data.monto = Math.max(...validValues).toFixed(2);
            }
        }
    }

    // --- REGLA 5: FECHA (Formatos Latinos) ---
    const dateRegex = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        data.fecha = `${year}-${month}-${day}`; // ISO para input date
    }

    return data;
  };

  const cleanMonto = (str) => {
    return str.replace(/,/g, '') // Quitar comas de miles
              .replace(/O/gi, '0') // Corrección OCR común: Letra O por Cero
              .replace(/l/gi, '1') // Letra l por Uno
              .replace(/S/gi, '5'); // Letra S por Cinco
  };

  // --- INTERACCIÓN ---
  const handleInputChange = (e) => setOcrData({ ...ocrData, [e.target.name]: e.target.value });
  const handleContinue = () => navigate("/nueva-factura", { state: { ocrData: ocrData } });

  // --- ZOOM / PAN (Mouse & Touch) ---
  const handleStart = (clientX, clientY) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
    }
  };
  const handleMove = (clientX, clientY) => {
    if (isDragging && zoom > 1) setPan({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };
  const handleEnd = () => setIsDragging(false);

  return (
    <section className="v2-section">
      <div className="v2-container">
        
        {/* ENCABEZADO */}
        <div className="v2-header">
          <button onClick={() => navigate("/facturas")} className="v2-back-btn">
            <ArrowLeft size={20} />
          </button>
          <h2>Escáner V2 (Sin Filtros)</h2>
        </div>

        {/* ÁREA DE VISUALIZACIÓN */}
        <div className="v2-card">
          <div className="v2-viewport"
               ref={containerRef}
               style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
               onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
               onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
               onMouseUp={handleEnd}
               onMouseLeave={handleEnd}
               onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
               onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
               onTouchEnd={handleEnd}
          >
            {image ? (
                <div 
                    className="v2-image-wrapper"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                >
                    <img src={image} alt="Factura" className="v2-image" draggable="false" />
                </div>
            ) : (
                <div className="v2-placeholder" onClick={() => fileInputRef.current.click()}>
                    <div className="v2-pulse-ring"><Camera size={48} /></div>
                    <p>Toca para escanear factura</p>
                </div>
            )}

            {/* CONTROLES FLOTANTES */}
            {image && (
                <div className="v2-controls">
                    <button onClick={() => setZoom(z => Math.max(1, z - 0.5))}><ZoomOut size={20}/></button>
                    <span>{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(4, z + 0.5))}><ZoomIn size={20}/></button>
                </div>
            )}
            
            {image && !loading && !ocrData && (
                <button className="v2-change-btn" onClick={() => fileInputRef.current.click()}>
                    <RotateCcw size={16}/> Otra Foto
                </button>
            )}
          </div>

          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" hidden />

          {/* BARRA DE PROGRESO */}
          {loading && (
            <div className="v2-loading-bar">
                <div className="v2-bar-fill" style={{ width: `${progress}%` }}></div>
                <span><Loader2 size={14} className="spin"/> {statusText}</span>
            </div>
          )}

          {/* ACCIÓN PRINCIPAL */}
          {image && !loading && !ocrData && (
            <button className="v2-action-btn" onClick={handleProcess}>
                <ScanText size={20} /> Analizar Documento
            </button>
          )}

          {/* RESULTADOS (FORMULARIO) */}
          {ocrData && (
            <div className="v2-results fade-in-up">
                <div className="v2-results-header">
                    <FileSearch size={20} className="text-cyan" />
                    <h3>Datos Detectados</h3>
                </div>

                <div className="v2-form-grid">
                    <div className="v2-field">
                        <label>Serie</label>
                        <div className="v2-input-wrap">
                            <input name="serie" value={ocrData.serie} onChange={handleInputChange} placeholder="-" />
                            <Edit2 size={14}/>
                        </div>
                    </div>
                    <div className="v2-field">
                        <label>DTE / Número</label>
                        <div className="v2-input-wrap">
                            <input name="dte" value={ocrData.dte} onChange={handleInputChange} placeholder="00000" />
                            <Edit2 size={14}/>
                        </div>
                    </div>
                    <div className="v2-field full">
                        <label>Monto Total (Q)</label>
                        <div className="v2-input-wrap highlight">
                            <input name="monto" value={ocrData.monto} onChange={handleInputChange} className="input-monto" />
                            <Edit2 size={14}/>
                        </div>
                        {!ocrData.monto && <small className="v2-warn"><AlertTriangle size={10}/> Revisar monto manual</small>}
                    </div>
                    <div className="v2-field">
                        <label>NIT Emisor</label>
                        <div className="v2-input-wrap">
                            <input name="nit_emisor" value={ocrData.nit_emisor} onChange={handleInputChange} placeholder="CF" />
                            <Edit2 size={14}/>
                        </div>
                    </div>
                    <div className="v2-field">
                        <label>Fecha</label>
                        <div className="v2-input-wrap">
                            <input type="date" name="fecha" value={ocrData.fecha} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>

                <button className="v2-save-btn" onClick={handleContinue}>
                    <Save size={18} /> Confirmar Datos
                </button>

                <details className="v2-debug">
                    <summary>Ver Texto Crudo (Debug)</summary>
                    <pre>{debugText}</pre>
                </details>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}