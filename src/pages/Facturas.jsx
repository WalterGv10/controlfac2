import { useNavigate } from "react-router-dom";

export default function Facturas() {
  const navigate = useNavigate();

  return (
    <section id="facturas" className="section">
      <div className="container">
        <div className="section-header">
          <h3>Facturas</h3>
          <p>Registro y consulta de facturas de parqueo.</p>
        </div>

        <div className="grid">
          <article className="card">
            <h4>Nueva factura</h4>
            <p>Ingresa una nueva factura con fecha, monto y foto del recibo.</p>
            <div className="actions">
              <button>Agregar factura</button>
              <button
                style={{
                  background: "transparent",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary)",
                }}
                onClick={() => navigate("/nueva-factura")}
              >
                Ver formulario
              </button>
            </div>
          </article>

          <article className="card">
            <h4>Mis facturas</h4>
            <p>Lista rápida de tus últimos ingresos (pronto: filtros por fecha).</p>
            <div className="actions">
              <button>Ver listado</button>
            </div>
          </article>

          <article className="card">
            <h4>Importar</h4>
            <p>Sube un CSV o imagen para procesar (OCR vendrá después).</p>
            <div className="actions">
              <button>Subir archivo</button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
