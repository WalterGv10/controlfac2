import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Calendar, DollarSign, FileText, Filter, Download, Search } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 
import "./ReporteMensual.css";

export default function ReporteMensual() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState([]);
  const [filteredFacturas, setFilteredFacturas] = useState([]);
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState(""); 

  const [resumen, setResumen] = useState({
    total: 0,
    cantidad: 0,
    pagadas: 0,
    pendientes: 0
  });

  useEffect(() => {
    fetchReporte();
  }, [selectedMonth]);

  useEffect(() => {
    const filtradas = facturas.filter(f => 
      f.tecnico?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFacturas(filtradas);
    calcularTotales(filtradas);
  }, [searchTerm, facturas]);

  const fetchReporte = async () => {
    setLoading(true);
    const startOfMonth = `${selectedMonth}-01`;
    const [year, month] = selectedMonth.split('-');
    const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .gte("fecha", startOfMonth)
      .lte("fecha", endOfMonth)
      .order("fecha", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setFacturas(data || []);
      setFilteredFacturas(data || []);
    }
    setLoading(false);
  };

  const calcularTotales = (data) => {
    const total = data.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
    const pagadas = data.filter(f => f.estado === 'Pagada').length;
    
    setResumen({
      total,
      cantidad: data.length,
      pagadas,
      pendientes: data.length - pagadas
    });
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  // ==========================================
  // 🖨️ GENERACIÓN DE PDF (VERTICAL OFICIAL)
  // ==========================================
  const handleExportPDF = () => {
    try {
      // 1. Orientación VERTICAL (Portrait)
      const doc = new jsPDF(); 
      
      // Cargar configuración guardada
      const configFirmas = JSON.parse(localStorage.getItem("config_firmas") || "{}");
      const nombreTecnico = searchTerm || configFirmas.tecnico || "General";
      const division = configFirmas.grupo || "ÁREA TECNOLÓGICA";

      // 2. ENCABEZADO
      // Título Principal
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text("Reporte de Gastos / Reembolso", 14, 20);
      
      // Subtítulos
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Periodo: ${selectedMonth}`, 14, 26);
      doc.text(`Técnico: ${nombreTecnico}`, 14, 31);
      
      // División Tecnológica (Alineada a la derecha)
      doc.setFontSize(10);
      doc.setTextColor(0, 150, 200); // Color azulado corporativo
      doc.text(division, 195, 20, { align: "right" });
      
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Fecha Impresión: ${new Date().toLocaleDateString()}`, 195, 26, { align: "right" });

      // 3. TABLA DE DATOS
      const tableColumn = [
        "Fecha", 
        "Documento", 
        "Detalle del Servicio", 
        "Monto (Q)"
      ];
      
      const tableRows = [];

      filteredFacturas.forEach(fac => {
        // Formateo de celda Documento
        const docInfo = `${fac.serie || ""}-${fac.dte || ""}\nNIT: ${fac.nit_emisor || ""}`;
        
        // Formateo de celda Detalle
        const detalles = `${fac.punto_servicio || ""}\n${fac.motivo_visita || ""}`;

        const row = [
          fac.fecha,
          docInfo,
          detalles,
          Number(fac.monto).toFixed(2)
        ];
        tableRows.push(row);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 38,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 20 }, // Fecha
          1: { cellWidth: 40 }, // Documento
          2: { cellWidth: 'auto' }, // Detalle (ocupa resto)
          3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }, // Monto
        }
      });

      // 4. TOTALES
      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 100;
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Total a Reembolsar: Q ${resumen.total.toFixed(2)}`, 14, finalY + 10);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Documentos adjuntos: ${resumen.cantidad}`, 14, finalY + 15);

      // 5. PIE DE PÁGINA (FIRMAS)
      let firmaY = finalY + 45; 
      if (firmaY > 260) { // Nueva página si no cabe
          doc.addPage();
          firmaY = 50;
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      
      // Líneas de firma
      doc.setLineWidth(0.5);
      doc.setDrawColor(150);
      
      // Configuración de columnas de firma
      const sectionWidth = (pageWidth - (margin * 2)) / 3;
      const x1 = margin;
      const x2 = margin + sectionWidth;
      const x3 = margin + (sectionWidth * 2);

      const lineLen = 45; 
      const offset = (sectionWidth - lineLen) / 2;

      // --- FIRMA 1: SOLICITANTE (Técnico) ---
      // Imagen de firma
      if (configFirmas.firmaImagen) {
          try {
              const isJpeg = configFirmas.firmaImagen.startsWith('data:image/jpeg');
              const imgFormat = isJpeg ? 'JPEG' : 'PNG';
              doc.addImage(configFirmas.firmaImagen, imgFormat, x1 + offset + 2, firmaY - 22, 40, 20); 
          } catch (e) { console.error(e); }
      }

      // Línea y Nombre
      doc.line(x1 + offset, firmaY, x1 + offset + lineLen, firmaY);
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text(configFirmas.tecnico || "Solicitante", x1 + offset + (lineLen/2), firmaY + 5, { align: "center" });
      
      // Datos Bancarios y División
      doc.setFontSize(7);
      doc.setTextColor(80);
      // Mostramos la división seleccionada
      doc.text(configFirmas.grupo || "Área Técnica", x1 + offset + (lineLen/2), firmaY + 9, { align: "center" });
      // Datos de Banco Industrial fijos + cuenta
      doc.text("Banco Industrial", x1 + offset + (lineLen/2), firmaY + 13, { align: "center" });
      doc.text(`Cta: ${configFirmas.cuenta || "---"}`, x1 + offset + (lineLen/2), firmaY + 17, { align: "center" });


      // --- FIRMA 2: COORDINADOR ---
      doc.line(x2 + offset, firmaY, x2 + offset + lineLen, firmaY);
      doc.setFontSize(8);
      doc.setTextColor(0);
      doc.text(configFirmas.coordinador || "Jefe Inmediato", x2 + offset + (lineLen/2), firmaY + 5, { align: "center" });
      doc.setTextColor(100);
      doc.text("Revisado por", x2 + offset + (lineLen/2), firmaY + 9, { align: "center" });

      // --- FIRMA 3: SECRETARIA ---
      doc.line(x3 + offset, firmaY, x3 + offset + lineLen, firmaY);
      doc.setTextColor(0);
      doc.text(configFirmas.secretaria || "Administración", x3 + offset + (lineLen/2), firmaY + 5, { align: "center" });
      doc.setTextColor(100);
      doc.text("Vo.Bo.", x3 + offset + (lineLen/2), firmaY + 9, { align: "center" });

      // 6. Descargar
      doc.save(`Reembolso_${division}_${selectedMonth}.pdf`);

    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Hubo un error al generar el PDF. Verifica la consola.");
    }
  };

  return (
    <section className="rm-section">
      <div className="rm-container">
        
        {/* HEADER */}
        <div className="rm-header">
          <button onClick={() => navigate("/reportes")} className="rm-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="rm-title-box">
            <h2>Reporte Mensual</h2>
            <div className="rm-controls">
              <div className="rm-control-item">
                <Calendar size={16} />
                <input 
                  type="month" 
                  value={selectedMonth} 
                  onChange={handleMonthChange} 
                  className="rm-month-input"
                />
              </div>
              <div className="rm-control-item search">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Filtrar por técnico..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rm-search-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="rm-stats-grid">
          <div className="rm-stat-card total">
            <div className="stat-icon"><DollarSign size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Total Filtrado</span>
              <span className="stat-value">Q {resumen.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="rm-stat-card count">
            <div className="stat-icon"><FileText size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Facturas</span>
              <span className="stat-value">{resumen.cantidad}</span>
            </div>
          </div>
          <button className="rm-export-btn" onClick={handleExportPDF} disabled={filteredFacturas.length === 0}>
             <Download size={20} /> Descargar PDF
          </button>
        </div>

        {/* LISTA */}
        <div className="rm-list-container">
          <h3 className="rm-subtitle">
            {searchTerm ? `Movimientos de: ${searchTerm}` : "Todos los movimientos"}
          </h3>
          
          {loading ? (
            <div className="rm-loading">Cargando datos...</div>
          ) : filteredFacturas.length === 0 ? (
            <div className="rm-empty">No se encontraron facturas con estos filtros.</div>
          ) : (
            <div className="rm-table-wrapper">
              <table className="rm-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Emisor / Técnico</th>
                    <th>Detalles</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacturas.map((fac) => (
                    <tr key={fac.id} onClick={() => navigate(`/factura/${fac.id}`)} className="clickable-row">
                      <td>{fac.fecha}</td>
                      <td>
                        <div className="cell-emisor">{fac.tecnico}</div>
                        <div className="cell-sub">{fac.nit_emisor}</div>
                      </td>
                      <td>
                        <div className="cell-detail">Serie: {fac.serie}</div>
                        <div className="cell-detail">DTE: {fac.dte}</div>
                      </td>
                      <td className="text-right font-bold">Q {Number(fac.monto).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}