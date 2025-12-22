import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, Calendar, DollarSign, FileText, Download, Search, Eye, X, Tag } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./ReporteMensual.css";

export default function ReporteMensual() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [facturas, setFacturas] = useState([]);
  const [filteredFacturas, setFilteredFacturas] = useState([]);
  const [perfil, setPerfil] = useState(null);

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [searchTerm, setSearchTerm] = useState("");

  const [resumen, setResumen] = useState({
    total: 0,
    cantidad: 0,
    pagadas: 0,
    pendientes: 0
  });

  useEffect(() => {
    if (session?.user) fetchData();
  }, [selectedMonth, session]);

  useEffect(() => {
    const filtradas = facturas.filter(f =>
      f.tecnico?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.punto_servicio?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFacturas(filtradas);
    calcularTotales(filtradas);
  }, [searchTerm, facturas]);

  const fetchData = async () => {
    setLoading(true);
    const startOfMonth = `${selectedMonth}-01`;
    const [year, month] = selectedMonth.split('-');
    const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

    try {
      const { data: facturasData, error: facturasError } = await supabase
        .from("facturas")
        .select("*")
        .gte("fecha", startOfMonth)
        .lte("fecha", endOfMonth)
        .order("fecha", { ascending: false });

      if (facturasError) throw facturasError;
      setFacturas(facturasData || []);
      setFilteredFacturas(facturasData || []);

      const { data: perfilData, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!perfilError && perfilData) setPerfil(perfilData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = (data) => {
    const total = data.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
    const pagadas = data.filter(f => f.estado === 'Pagada').length;
    setResumen({ total, cantidad: data.length, pagadas, pendientes: data.length - pagadas });
  };

  const handleMonthChange = (e) => setSelectedMonth(e.target.value);

  const isMunicipal = (fac) => fac.dte === 'TICKET' || fac.tipo === 'PARQUEO' || fac.tipo === 'PEAJE';

  const formatDate = (dateStr) => {
    if (!dateStr) return "--/--/----";
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const generatePDFBlob = () => {
    const doc = new jsPDF();
    const nombreTecnico = searchTerm || perfil?.nombre_tecnico || "General";
    const division = perfil?.grupo_tecnico || "ÁREA TECNOLÓGICA";
    const cuenta = perfil?.numero_cuenta || "---";
    const firmaImg = perfil?.firma_digital;

    const firmaTecnico = perfil?.nombre_tecnico || "Solicitante";
    const firmaCoord = perfil?.nombre_coordinador || "Jefe Inmediato";
    const firmaSecre = perfil?.nombre_secretaria || "Administración";

    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE MENSUAL DE GASTOS", 105, 20, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Periodo: ${selectedMonth}`, 14, 30);
    doc.text(`Técnico: ${nombreTecnico}`, 14, 35);

    doc.setFontSize(10);
    doc.setTextColor(0, 150, 200);
    doc.text(division, 195, 30, { align: "right" });

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 195, 35, { align: "right" });

    const tableColumn = ["Fecha", "Tipo / Documento", "Detalle del Servicio", "Monto (Q)"];

    const tableRows = filteredFacturas.map(fac => {
      let docTypeInfo = "";
      if (isMunicipal(fac)) {
        const tipoRecibo = fac.tipo || "RECIBO";
        docTypeInfo = `${tipoRecibo}\nRecibo #: ${fac.serie}`;
      } else {
        docTypeInfo = `FACTURA\n${fac.serie}-${fac.dte}`;
      }

      if (fac.nit_emisor) docTypeInfo += `\nNIT: ${fac.nit_emisor}`;

      // 🛑 Incluimos aquí la descripción / motivo de visita
      const detalles = `${fac.punto_servicio || ""}\n${fac.motivo_visita || ""}`;

      return [
        formatDate(fac.fecha),
        docTypeInfo,
        detalles,
        Number(fac.monto).toFixed(2)
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 45 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || 100;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Total a Reembolsar: Q ${resumen.total.toFixed(2)}`, 14, finalY + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Documentos adjuntos: ${resumen.cantidad}`, 14, finalY + 15);

    let firmaY = finalY + 45;
    if (firmaY > 260) { doc.addPage(); firmaY = 50; }

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    doc.setLineWidth(0.5);
    doc.setDrawColor(150);
    const sectionWidth = (pageWidth - (margin * 2)) / 3;
    const offset = (sectionWidth - 45) / 2;
    const lineLen = 45;

    if (firmaImg) {
      try {
        const isJpeg = firmaImg.startsWith('data:image/jpeg');
        const imgFormat = isJpeg ? 'JPEG' : 'PNG';
        doc.addImage(firmaImg, imgFormat, margin + offset + 2, firmaY - 22, 40, 20);
      } catch (e) { console.error("Error imagen firma", e); }
    }

    doc.line(margin + offset, firmaY, margin + offset + lineLen, firmaY);
    doc.setFontSize(8); doc.setTextColor(0);
    doc.text(firmaTecnico, margin + offset + (lineLen / 2), firmaY + 5, { align: "center" });

    doc.setFontSize(7); doc.setTextColor(80);
    doc.text(division, margin + offset + (lineLen / 2), firmaY + 9, { align: "center" });
    doc.text("Banco Industrial", margin + offset + (lineLen / 2), firmaY + 13, { align: "center" });
    doc.text(`Cta: ${cuenta}`, margin + offset + (lineLen / 2), firmaY + 17, { align: "center" });

    const x2 = margin + sectionWidth;
    doc.line(x2 + offset, firmaY, x2 + offset + lineLen, firmaY);
    doc.setFontSize(8); doc.setTextColor(0);
    doc.text(firmaCoord, x2 + offset + (lineLen / 2), firmaY + 5, { align: "center" });
    doc.setTextColor(100);
    doc.text("Revisado por", x2 + offset + (lineLen / 2), firmaY + 9, { align: "center" });

    const x3 = margin + (sectionWidth * 2);
    doc.line(x3 + offset, firmaY, x3 + offset + lineLen, firmaY);
    doc.setTextColor(0);
    doc.text(firmaSecre, x3 + offset + (lineLen / 2), firmaY + 5, { align: "center" });
    doc.setTextColor(100);
    doc.text("Vo.Bo.", x3 + offset + (lineLen / 2), firmaY + 9, { align: "center" });

    return doc.output('bloburl');
  };

  const handlePreview = () => {
    const url = generatePDFBlob();
    setPdfPreviewUrl(url);
    setShowPreview(true);
  };

  const handleDownload = () => {
    const blobUrl = generatePDFBlob();
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Gastos_Mensuales_${selectedMonth}.pdf`;
    link.click();
  };

  return (
    <section className="rm-section">
      <div className="rm-container">
        <div className="rm-header">
          <button onClick={() => navigate("/reportes")} className="rm-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="rm-title-box">
            <h2>Reporte Mensual</h2>
            <div className="rm-controls">
              <div className="rm-control-item">
                <Calendar size={16} />
                <input type="month" value={selectedMonth} onChange={handleMonthChange} className="rm-month-input" />
              </div>
              <div className="rm-control-item search">
                <Search size={16} />
                <input type="text" placeholder="Filtrar por técnico o lugar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="rm-search-input" />
              </div>
            </div>
          </div>
        </div>

        <div className="rm-stats-grid">
          <div className="rm-stat-card total">
            <div className="stat-icon"><DollarSign size={24} /></div>
            <div className="stat-info"><span className="stat-label">Total Filtrado</span><span className="stat-value">Q {resumen.total.toFixed(2)}</span></div>
          </div>
          <div className="rm-stat-card count">
            <div className="stat-icon"><FileText size={24} /></div>
            <div className="stat-info"><span className="stat-label">Documentos</span><span className="stat-value">{resumen.cantidad}</span></div>
          </div>
          <button className="rm-export-btn" onClick={handlePreview} disabled={filteredFacturas.length === 0}>
            <Eye size={20} /> Vista Previa PDF
          </button>
        </div>

        <div className="rm-list-container">
          <h3 className="rm-subtitle">
            {searchTerm ? `Resultados para: "${searchTerm}"` : "Detalle de Gastos"}
          </h3>

          {loading ? (
            <div className="rm-loading">Cargando datos...</div>
          ) : filteredFacturas.length === 0 ? (
            <div className="rm-empty">No se encontraron movimientos.</div>
          ) : (
            <div className="rm-table-wrapper">
              <table className="rm-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Emisor / Técnico</th>
                    <th>Documento</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacturas.map((fac) => {
                    const isTicket = isMunicipal(fac);
                    return (
                      <tr key={fac.id} onClick={() => navigate(`/factura/${fac.id}`)} className="clickable-row">
                        <td data-label="Fecha">{formatDate(fac.fecha)}</td>
                        <td data-label="Emisor">
                          <div className="cell-emisor">{fac.tecnico}</div>
                          <div className="cell-sub">{fac.nit_emisor ? `NIT: ${fac.nit_emisor}` : (isTicket ? 'MUNICIPAL' : 'C/F')}</div>
                        </td>
                        <td data-label="Documento">
                          <div className="cell-detail">
                            {isTicket ? (
                              <span className="doc-badge ticket"><Tag size={10} /> {fac.tipo || "RECIBO"}</span>
                            ) : (
                              <span className="doc-badge sat">FACTURA SAT</span>
                            )}
                          </div>
                          <div className="cell-detail-main">
                            {isTicket ? `Recibo: ${fac.serie}` : `${fac.serie} - ${fac.dte}`}
                          </div>
                          <div className="cell-sub">{fac.punto_servicio}</div>
                          {/* 👇 Se agregó el motivo de visita aquí */}
                          <div className="cell-sub" style={{ fontStyle: 'italic', color: '#aaa', marginTop: '2px' }}>
                            {fac.motivo_visita}
                          </div>
                        </td>
                        <td data-label="Monto" className="text-right font-bold">Q {Number(fac.monto).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="pdf-modal-overlay">
          <div className="pdf-modal-content">
            <div className="pdf-modal-header">
              <h3>Vista Previa del Documento</h3>
              <button onClick={() => setShowPreview(false)} className="pdf-close-btn"><X size={24} /></button>
            </div>
            <div className="pdf-iframe-container"><iframe src={pdfPreviewUrl} title="Vista Previa PDF" className="pdf-preview-iframe"></iframe></div>
            <div className="pdf-modal-footer">
              <button onClick={() => setShowPreview(false)} className="pdf-cancel-btn">Cerrar</button>
              <button onClick={handleDownload} className="pdf-download-btn"><Download size={18} /> Descargar Archivo</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}