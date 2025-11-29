import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Calendar, TrendingUp, Award, DollarSign } from "lucide-react";
import "./ReporteAnual.css";

export default function ReporteAnual() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Año actual por defecto
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [stats, setStats] = useState({
    totalAnual: 0,
    mejorMes: { nombre: "-", monto: 0 },
    promedioMensual: 0
  });

  const [mesesData, setMesesData] = useState([]);

  useEffect(() => {
    fetchDataAnual();
  }, [selectedYear]);

  const fetchDataAnual = async () => {
    setLoading(true);
    const startOfYear = `${selectedYear}-01-01`;
    const endOfYear = `${selectedYear}-12-31`;

    const { data, error } = await supabase
      .from("facturas")
      .select("*")
      .gte("fecha", startOfYear)
      .lte("fecha", endOfYear);

    if (error) {
      console.error("Error cargando reporte anual:", error);
    } else {
      procesarDatos(data || []);
    }
    setLoading(false);
  };

  const procesarDatos = (facturas) => {
    // 1. Inicializar los 12 meses
    const meses = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      nombre: new Date(0, i).toLocaleString('es-GT', { month: 'long' }),
      total: 0,
      cantidad: 0
    }));

    // 2. Agrupar facturas por mes
    let totalAnual = 0;
    
    facturas.forEach(f => {
      const fecha = new Date(f.fecha + 'T00:00:00'); // Forzar zona horaria local
      const mesIndex = fecha.getMonth();
      const monto = Number(f.monto || 0);
      
      if (meses[mesIndex]) {
        meses[mesIndex].total += monto;
        meses[mesIndex].cantidad += 1;
        totalAnual += monto;
      }
    });

    // 3. Calcular estadísticas
    const mejorMes = meses.reduce((max, curr) => curr.total > max.total ? curr : max, meses[0]);
    const promedio = totalAnual / 12;

    // 4. Calcular porcentajes para las barras gráficas
    // Buscamos el valor máximo para que sea el 100% de la barra
    const maxTotal = Math.max(...meses.map(m => m.total)) || 1; 

    const mesesConPorcentaje = meses.map(m => ({
      ...m,
      porcentaje: (m.total / maxTotal) * 100
    }));

    setStats({
      totalAnual,
      mejorMes: { nombre: mejorMes.nombre, monto: mejorMes.total },
      promedioMensual: promedio
    });

    setMesesData(mesesConPorcentaje);
  };

  return (
    <section className="ra-section">
      <div className="ra-container">
        
        {/* HEADER */}
        <div className="ra-header">
          <button onClick={() => navigate("/reportes")} className="ra-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div className="ra-title-box">
            <h2>Reporte Anual</h2>
            <div className="ra-year-selector">
              <button onClick={() => setSelectedYear(y => y - 1)} className="year-btn">{"<"}</button>
              <span className="year-display">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="year-btn">{">"}</button>
            </div>
          </div>
        </div>

        {/* TARJETAS DE RESUMEN */}
        <div className="ra-stats-grid">
          <div className="ra-stat-card primary">
            <div className="stat-icon"><DollarSign size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Total Anual</span>
              <span className="stat-value">Q {stats.totalAnual.toFixed(2)}</span>
            </div>
          </div>

          <div className="ra-stat-card success">
            <div className="stat-icon"><Award size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Mejor Mes</span>
              <span className="stat-value capitalize">{stats.mejorMes.nombre}</span>
              <span className="stat-subvalue">Q {stats.mejorMes.monto.toFixed(2)}</span>
            </div>
          </div>

          <div className="ra-stat-card info">
            <div className="stat-icon"><TrendingUp size={24} /></div>
            <div className="stat-info">
              <span className="stat-label">Promedio / Mes</span>
              <span className="stat-value">Q {stats.promedioMensual.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* GRÁFICA DE BARRAS (MESES) */}
        <div className="ra-chart-container">
          <h3 className="ra-subtitle">Desglose Mensual</h3>
          
          {loading ? (
            <div className="ra-loading">Calculando año...</div>
          ) : (
            <div className="ra-chart-grid">
              {mesesData.map((mes) => (
                <div key={mes.index} className="ra-month-row">
                  <div className="month-label capitalize">{mes.nombre}</div>
                  
                  <div className="month-bar-container">
                    <div 
                      className="month-bar-fill" 
                      style={{ width: `${mes.porcentaje}%` }}
                    ></div>
                  </div>
                  
                  <div className="month-values">
                    <span className="month-total">Q {mes.total.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                    <span className="month-count">({mes.cantidad})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}