import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Tesseract from "tesseract.js";
import { ArrowLeft, Upload, Camera, CheckCircle, Loader2, Edit2, RotateCcw, Wand2, ZoomIn, ZoomOut, Move } from "lucide-react";
import "./ImportarFactura.css";

export default function ImportarFactura() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  
  // 🔍 Estado para Zoom y Paneo
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [ocrData, setOcrData] = useState(null);

  // --- 1. SELECCIÓN DE IMAGEN ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setProcessedImage(null);
      setOcrData(null);
      setProgress(0);
      
      // Resetear vista
      setZoom(1); 
      setPan({ x: 0, y: 0 });
    }
  };

  // --- LOGICA DE ARRASTRE (PAN) ---
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
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Soporte Táctil
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
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  // --- 2. PRE-PROCESAMIENTO SUAVE ---
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

        // Filtro de contraste mejorado
        const contrast = 1.3; 
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          let gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          gray = gray * contrast + intercept;
          gray = Math.max(0, Math.min(255, gray));

          data[i] = gray;     // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
    });
  };

  // --- 3. PROCESAR IMAGEN ---
  const handleProcessImage = async () => {
    if (!image) return;

    setLoading(true);
    setStatusText("Mejorando nitidez...");

    try {
      const optimizedImgUrl = await preprocessImage(image);
      setProcessedImage(optimizedImgUrl);

      setStatusText("Analizando documento...");
      
      const result = await Tesseract.recognize(
        optimizedImgUrl,
        'spa', 
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setProgress(parseInt(m.progress * 100));
              setStatusText(`Leyendo datos: ${parseInt(m.progress * 100)}%`);
            } else {
              setStatusText("Procesando...");
            }
          },
        }
      );

      const extractedData = parseOCRText(result.data.text);
      setOcrData(extractedData);
      setStatusText("¡Datos encontrados!");

    } catch (error) {
      console.error("Error OCR:", error);
      alert("Error al leer la imagen. Intenta enfocar mejor.");
    } finally {
      setLoading(false);
    }
  };

  // --- 4. LÓGICA DE DETECCIÓN INTELIGENTE ---
  const parseOCRText = (text) => {
    const fullText = text
        .toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/O/g, '0');

    const data = {
      serie: "",
      dte: "",
      monto: "",
      nit_emisor: "",
      fecha: "",
      motivo_visita: "", 
      rawText: text 
    };

    // 1. DTE / NUMERO
    const uuidRegex = /\b([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})\b/i;
    const uuidMatch = fullText.match(uuidRegex);
    if (uuidMatch && uuidMatch[1]) {
        data.dte = uuidMatch[1]; 
    }

    if (!data.dte) {
        // Regex robusto para capturar "No.:", "No:", "N°", etc.
        const dteLabelRegex = /(?:FACTURA|NUMERO|NUM|NO\s*\.\s*:|NO\.|NO:|N°|#|DTE|DOCTO|DOC|TICKET|BOLETA|TRANS|FOLIO|ENVIO|ID)\s*[:.;-]?\s*([A-Z0-9-]{1,25})/i;
        const dteMatch = fullText.match(dteLabelRegex);
        if (dteMatch && dteMatch[1]) {
             data.dte = dteMatch[1].replace(/[^A-Z0-9-]/g, '');
        }
    }

    // 2. SERIE
    const serieRegex = /(?:SERIE|ERIE|SER|SR|5ERIE|S\.|^S\s)\s*[:.;-]?\s*([A-Z0-9-]{1,15})/i;
    const serieMatch = fullText.match(serieRegex);
    if (serieMatch && serieMatch[1]) {
        data.serie = serieMatch[1].replace(/[^A-Z0-9-]/g, '');
    }

    // 3. RESCATE
    if (!data.serie || !data.dte) {
        const orphanRegex = /(?:^|\n|\s)([A-Z]{1,5})\s*[-.\s]+\s*([0-9-]{2,20})(?:\s|$|\n)/;
        const orphanMatch = fullText.match(orphanRegex);
        
        if (orphanMatch) {
             const possibleSerie = orphanMatch[1];
             const blackList = ["TOTAL", "NIT", "FECHA", "PAGO", "CAJA", "EFECTIVO", "CAMBIO", "GTQ", "SUB", "VISA", "BAC"];
             
             if (!blackList.includes(possibleSerie)) {
                 if (!data.serie) data.serie = possibleSerie;
                 if (!data.dte) data.dte = orphanMatch[2];
             }
        }
    }

    // 4. NIT
    const nitRegex = /NIT\s*[:.;]?\s*([0-9-]{5,15})/i;
    const nitMatch = fullText.match(nitRegex);
    if (nitMatch && nitMatch[1]) {
        data.nit_emisor = nitMatch[1].replace(/\s/g, '').replace(/-/g, '');
    }

    // 5. FECHA
    const dateRegex = /(\d{2})[\/.-](\d{2})[\/.-](\d{4})/;
    const dateMatch = fullText.match(dateRegex);
    if (dateMatch) {
        data.fecha = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // 6. MONTO
    const totalLabelRegex = /(?:TOTAL|PAGAR|VENTA)\s*(?:Q|GTQ)?\s*[:.]?\s*([0-9,]+\.[0-9]{2})/i;
    const totalMatch = fullText.match(totalLabelRegex);

    if (totalMatch && totalMatch[1]) {
        data.monto = totalMatch[1].replace(/,/g, '');
    } else {
        const allPricesRegex = /(?:Q|GTQ)?\s*([0-9,]+\.[0-9]{2})/g;
        const matches = [...fullText.matchAll(allPricesRegex)];
        if (matches.length > 0) {
            const prices = matches.map(m => parseFloat(m[1].replace(/,/g, '')));
            const validPrices = prices.filter(p => p < 50000 && p !== 2024 && p !== 2025 && p !== 2023);
            const maxPrice = Math.max(...validPrices);
            if (!isNaN(maxPrice) && maxPrice > 0) data.monto = maxPrice.toFixed(2);
        }
    }

    return data;
  };

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    setOcrData({ ...ocrData, [e.target.name]: e.target.value });
  };

  const handleContinue = () => {
    navigate("/nueva-factura", { state: { ocrData: ocrData } });
  };

  return (
    <section className="if-section">
      <div className="if-container">
        
        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

        <div className="if-header fade-in">
          <button onClick={() => navigate("/facturas")} className="if-back-btn">
            <ArrowLeft size={20} /> Volver
          </button>
          <h2 className="if-title">Escáner IA</h2>
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
                <h3>Foto del Recibo</h3>
                <p>Asegúrate que se vea el TOTAL y el No. DTE</p>
                <button className="if-btn-select">
                   <Upload size={18} /> Seleccionar
                </button>
              </div>
            ) : (
              <div 
                className="if-preview-container" 
                style={{ 
                   overflow: 'hidden', 
                   cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' 
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              >
                {/* 🔍 CONTROLES DE ZOOM FLOTANTES */}
                <div className="zoom-controls">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(1, z - 0.5)); }} 
                    className="zoom-btn"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(4, z + 0.5)); }} 
                    className="zoom-btn"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>

                {/* IMAGEN TRANSFORMABLE */}
                <div 
                  className="img-wrapper" 
                  style={{ 
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.2s ease',
                  }}
                >
                  <img 
                      src={processedImage || image} 
                      alt="Preview" 
                      className={`if-image-preview ${processedImage ? 'processed-filter' : ''}`}
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
                        <Wand2 size={12} /> Nitidez Mejorada
                    </div>
                )}

                {zoom > 1 && !isDragging && (
                   <div className="drag-hint">
                      <Move size={12} /> Arrastra para mover
                   </div>
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
               🔍 Escanear Datos
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
                        <input type="text" name="serie" value={ocrData.serie} onChange={handleInputChange} placeholder="S/N" />
                        <Edit2 size={14} className="edit-icon" />
                    </div>
                 </div>

                 <div className="if-input-group">
                    <label>Número / DTE</label>
                    <div className="input-wrapper">
                        <input type="text" name="dte" value={ocrData.dte} onChange={handleInputChange} placeholder="---" />
                        <Edit2 size={14} className="edit-icon" />
                    </div>
                 </div>

                 <div className="if-input-group full-width highlight">
                    <label>Monto Total (Q)</label>
                    <div className="input-wrapper">
                        <input type="text" name="monto" value={ocrData.monto} onChange={handleInputChange} placeholder="0.00" className="input-monto" />
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

              <details style={{marginTop: '20px', fontSize: '0.7rem', color: '#666'}}>
                <summary>Ver Texto Original (Debug)</summary>
                <pre style={{whiteSpace: 'pre-wrap', marginTop: '10px'}}>{ocrData.rawText}</pre>
              </details>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}