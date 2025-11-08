export default function Reportes() {
  return (
    <section id="reportes" className="section">
      <div className="container">
        <div className="section-header">
          <h3>Reportes</h3>
          <p>Totales por mes y año. Próximamente exportación a PDF.</p>
        </div>

        <div className="grid">
          <article className="card">
            <h4>Reporte mensual</h4>
            <p>Resumen del mes actual: total en parqueos y conteo de facturas.</p>
            <div className="actions">
              <button>Ver resumen</button>
              <button style={{ background: "transparent", color: "var(--color-primary)", border: "1px solid var(--color-primary)" }}>
                Exportar PDF
              </button>
            </div>
          </article>

          <article className="card">
            <h4>Reporte anual</h4>
            <p>Comparativa por meses y acumulado anual.</p>
            <div className="actions">
              <button>Ver anual</button>
            </div>
          </article>

          <article className="card">
            <h4>Firmas</h4>
            <p>Espacio para gestionar firmas del técnico, coordinador y secretaria.</p>
            <div className="actions">
              <button>Configurar</button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
