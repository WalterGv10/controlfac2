import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import { 
  ArrowLeft, Camera, Upload, CheckCircle, Loader2, 
  Edit2, RotateCcw, Wand2, ZoomIn, ZoomOut, Move 
} from "lucide-react";
import "./ImportarFactura.css";

export default function ImportarFactura() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Estados de Imagen y UI
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  
  // Estados de Zoom y Navegación de Imagen
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Datos extraídos
  const [ocrData, setOcrData] = useState(null);

  // -------------------------------------------------------------------------
  // 1. CARGA DE IMAGEN
  // -------------------------------------------------------------------------
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setProcessedImage(null);
      setOcrData(null);
      setProgress(0);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  // -------------------------------------------------------------------------
  // 2. PRE-PROCESAMIENTO PARA TICKET TÉRMICO
  // -------------------------------------------------------------------------
  const preprocessImage = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Filtro: Aumento de contraste y binarización inteligente
        const contrast = 1.4; 
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Grayscale ponderado
          let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          
          // Contraste
          gray = gray * contrast + intercept;
          
          // Clamping
          gray = Math.max(0, Math.min(255, gray));

          // Thresholding suave para limpiar ruido térmico
          if (gray > 150) gray = 255; 
          else if (gray < 90) gray = 0;

          data[i] = gray;     // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
    });
  };

  // -------------------------------------------------------------------------
  // 3. MOTOR OCR
  // -------------------------------------------------------------------------
  const handleProcessImage = async () => {
    if (!image) return;
    setLoading(true);
    setStatusText("Optimizando ticket...");

    try {
      const optimizedImgUrl = await preprocessImage(image);
      setProcessedImage(optimizedImgUrl);

      setStatusText("Leyendo caracteres...");
      
      const result = await Tesseract.recognize(
        optimizedImgUrl,
        'spa', 
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setProgress(parseInt(m.progress * 100));
              setStatusText(`Analizando: ${parseInt(m.progress * 100)}%`);
            } else {
              setStatusText("Procesando...");
            }
          },
        }
      );

      const data = parseOCR(result.data.text);
      setOcrData(data);
      setStatusText("¡Lectura completada!");

    } catch (error) {
      console.error(error);
      alert("Error al leer. Intenta mejorar la iluminación.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // 4. LÓGICA DE EXTRACCIÓN (CORREGIDA)
  // -------------------------------------------------------------------------
  const parseOCR = (text) => {
    // 1. Limpieza MENOS agresiva (No convertimos O -> 0 globalmente todavía)
    const fullText = text
        .toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Sin tildes
        .replace(/\|/g, '1'); // Barras verticales son 1

    const data = {
      serie: "",
      dte: "",
      monto: "",
      nit_emisor: "",
      fecha: "",
      motivo_visita: "",
      rawText: text
    };

    // ===============================================
    // A. DTE / NUMERO (PRIORIDAD ALTA)
    // ===============================================
    // Regex que cubre:
    // "NUMERO: 3291"
    // "NUMER0: 3291" (Error OCR común)
    // "No.: 3291"
    // "N° 3291"
    
    // \s* permite espacios.
    // [\w\s]* permite errores tipográficos leves dentro de la palabra "NUMERO"
    const numeroExplicitRegex = /(?:NUMERO|NUMER0|NUM|NO\.|NO:|N°|#|DTE)\s*[:.]?\s*([0-9]+)/i;
    const explicitMatch = fullText.match(numeroExplicitRegex);

    if (explicitMatch && explicitMatch[1]) {
        // Encontramos el número explícito
        data.dte = explicitMatch[1];
    } 
    else {
        // Fallback: Buscar "Ticket", "Doc", etc.
        const dteRegex = /(?:TICKET|DOCTO|DOC|FACTURA)\s*[:.;-]?\s*([0-9-]{1,15})(?!\d)/i;
        const dteMatch = fullText.match(dteRegex);

        if (dteMatch && dteMatch[1]) {
            data.dte = dteMatch[1].replace(/[^0-9]/g, '');
        } 
    }

    // ===============================================
    // B. SERIE (Debe tener letras)
    // ===============================================
    // Buscamos SERIE, ERIE, SER, etc.
    const serieRegex = /(?:SERIE|ERIE|SER|SR|S\.|^S\s)\s*[:.;-]?\s*([A-Z0-9-]{1,10})/i;
    const serieMatch = fullText.match(serieRegex);

    if (serieMatch && serieMatch[1]) {
       // Validamos que tenga al menos una letra (A-Z) para diferenciar de montos
       if (/[A-Z]/.test(serieMatch[1])) {
          data.serie = serieMatch[1].replace(/[^A-Z0-9-]/g, '');
       }
    }

    // ===============================================
    // C. ESTRATEGIA DE RESCATE (Huérfanos)
    // ===============================================
    if (!data.serie || !data.dte) {
        // Patrón visual: Letras solas + Espacio + Números solos
        const orphanRegex = /(?:^|\n|\s)([A-Z]{1,5})\s+([0-9]{1,10})(?:\s|$|\n)/;
        const orphanMatch = fullText.match(orphanRegex);
        
        if (orphanMatch) {
            const potentialSerie = orphanMatch[1];
            const potentialDte = orphanMatch[2];
            
            // Palabras prohibidas que parecen series
            const blacklist = ["TOTAL", "NIT", "PAGO", "EFECTIVO", "CAMBIO", "VISA", "GTQ", "SUB"];
            
            if (!blacklist.includes(potentialSerie)) {
                if (!data.serie) data.serie = potentialSerie;
                if (!data.dte) data.dte = potentialDte;
            }
        }
    }

    // ===============================================
    // D. OTROS DATOS (NIT, FECHA, MONTO)
    // ===============================================
    // NIT
    const nitRegex = /NIT\s*[:.;]?\s*([0-9-]{5,15})/i;
    const nitMatch = fullText.match(nitRegex);
    if (nitMatch) data.nit_emisor = nitMatch[1].replace(/\s|-/g, '');

    // FECHA
    const dateRegex = /(\d{2})[\/.-](\d{2})[\/.-](\d{4})/;
    const dateMatch = fullText.match(dateRegex);
    if (dateMatch) data.fecha = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;

    // MONTO
    // Primero intentamos buscar "TOTAL"
    const totalRegex = /(?:TOTAL|PAGAR|VENTA)\s*(?:Q|GTQ)?\s*[:.]?\s*([0-9,]+\.[0-9]{2})/i;
    const totalMatch = fullText.match(totalRegex);
    
    if (totalMatch) {
        data.monto = totalMatch[1].replace(/,/g, '');
    } else {
        // Si falla, buscamos precios sueltos y tomamos el mayor lógico
        const priceRegex = /(?:Q|GTQ)?\s*([0-9,]+\.[0-9]{2})/g;
        const matches = [...fullText.matchAll(priceRegex)];
        if (matches.length > 0) {
            const prices = matches.map(m => parseFloat(m[1].replace(/,/g, '')));
            // Filtramos años (2024, 2025) que se confunden con precios
            const validPrices = prices.filter(p => p < 50000 && p !== 2024 && p !== 2025);
            const max = Math.max(...validPrices);
            if (max > 0 && isFinite(max)) data.monto = max.toFixed(2);
        }
    }

    return data;
  };

  // -------------------------------------------------------------------------
  // 5. NAVEGACIÓN Y ZOOM
  // -------------------------------------------------------------------------
  const handleInputChange = (e) => {
    setOcrData({ ...ocrData, [e.target.name]: e.target.value });
  };

  const handleContinue = () => {
    navigate("/nueva-factura", { state: { ocrData: ocrData } });
  };

  // Eventos de Mouse/Touch para Zoom
  const handleMouseDown = (e) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      e.preventDefault();
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (zoom > 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };
  const handleTouchMove = (e) => {
    if (isDragging && zoom > 1) {
      const touch = e.touches[0];
      setPan({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
    }
  };

  return (
    <section className="if-section">
      <div className="if-container">
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

        <div className="if-header fade-in">
          <button onClick={() => navigate("/facturas")} className="if-back-btn">
            <ArrowLeft size={20} /> Volver
          </button>
          <h2 className="if-title">Escáner Ticket</h2>
        </div>

        <div className="if-card fade-in-up">
          <div className="if-upload-zone">
            <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: 'none' }} 
            />
            
            {!image ? (
              <div className="if-placeholder" onClick={() => fileInputRef.current.click()}>
                <div className="if-icon-circle pulse">
                   <Camera size={40} />
                </div>
                <h3>Foto del Ticket</h3>
                <p>Asegúrate que se vea "Serie" y "Numero"</p>
                <button className="if-btn-select">
                   <Upload size={18} /> Subir Foto
                </button>
              </div>
            ) : (
              <div 
                className="if-preview-container" 
                style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                <div className="zoom-controls">
                  <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(1, z - 0.5)); }} className="zoom-btn">
                    <ZoomOut size={16} />
                  </button>
                  <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                  <button onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(4, z + 0.5)); }} className="zoom-btn">
                    <ZoomIn size={16} />
                  </button>
                </div>

                <div 
                  className="img-wrapper"
                  style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                    transition: isDragging ? 'none' : 'transform 0.2s ease',
                  }}
                >
                  <img 
                      src={processedImage || image} 
                      alt="Preview" 
                      className="if-image-preview"
                      style={{ pointerEvents: 'none' }} 
                  />
                </div>

                {loading && <div className="scanner-line"></div>}

                {!loading && !ocrData && (
                  <button className="if-btn-change" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
                     <RotateCcw size={16} /> Cambiar
                  </button>
                )}
                
                {processedImage && !loading && (
                    <div className="processed-badge">
                        <Wand2 size={12} /> Filtro Térmico
                    </div>
                )}
                
                {zoom > 1 && !isDragging && (
                   <div className="drag-hint"><Move size={12} /> Arrastra para ver</div>
                )}
              </div>
            )}
          </div>

          {loading && (
            <div className="if-progress-container fade-in">
              <div className="if-progress-bar">
                <div className="if-progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="if-status-text">
                 <Loader2 size={16} className="spin" /> {statusText}
              </p>
            </div>
          )}

          {image && !loading && !ocrData && (
             <button className="if-btn-process fade-in-up" onClick={handleProcessImage}>
               🔍 Leer Ticket
             </button>
          )}

          {ocrData && !loading && (
            <div className="if-results fade-in-up">
              <div className="if-results-header">
                 <CheckCircle size={20} className="text-neon-green" />
                 <h3>Datos Detectados</h3>
              </div>
              
              <div className="if-fields-grid">
                 <div className="if-input-group">
                    <label>Serie</label>
                    <div className="input-wrapper">
                        <input type="text" name="serie" value={ocrData.serie} onChange={handleInputChange} placeholder="A" />
                        <Edit2 size={14} className="edit-icon" />
                    </div>
                 </div>

                 <div className="if-input-group">
                    <label>Número / DTE</label>
                    <div className="input-wrapper">
                        <input type="text" name="dte" value={ocrData.dte} onChange={handleInputChange} placeholder="12345" />
                        <Edit2 size={14} className="edit-icon" />
                    </div>
                 </div>

                 <div className="if-input-group full-width highlight">
                    <label>Monto Total (Q)</label>
                    <div className="input-wrapper">
                        <input type="text" name="monto" value={ocrData.monto} onChange={handleInputChange} className="input-monto" />
                        <Edit2 size={14} className="edit-icon" />
                    </div>
                 </div>

                 <div className="if-input-group">
                    <label>NIT Emisor</label>
                    <div className="input-wrapper">
                        <input type="text" name="nit_emisor" value={ocrData.nit_emisor} onChange={handleInputChange} placeholder="CF" />
                        <Edit2 size={14} className="edit-icon" />
                    </div>
                 </div>

                 <div className="if-input-group">
                    <label>Fecha</label>
                    <div className="input-wrapper">
                        <input type="date" name="fecha" value={ocrData.fecha} onChange={handleInputChange} />
                    </div>
                 </div>
              </div>

              <button className="if-btn-continue" onClick={handleContinue}>
                Confirmar <ArrowLeft size={18} style={{transform: 'rotate(180deg)'}} />
              </button>

              <details className="debug-details">
                <summary>Ver Texto Crudo (Debug)</summary>
                <pre>{ocrData.rawText}</pre>
              </details>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}