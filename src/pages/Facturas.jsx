import { useNavigate } from "react-router-dom";
import { UploadCloud } from "lucide-react"; // Agregué un icono opcional

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
          {/* --- TARJETA 1: NUEVA FACTURA --- */}
          <article className="card">
            <h4>Nueva factura</h4>
            <p>Ingresa una nueva factura con fecha, monto y foto del recibo.</p>
            <div className="actions">
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

          {/* --- TARJETA 2: MIS FACTURAS --- */}
          <article className="card">
            <h4>Mis facturas</h4>
            <p>Lista rápida de tus últimos ingresos (visualiza estados y atrasos).</p>
            <div className="actions">
              <button onClick={() => navigate("/mis-facturas")}>
                Ver listado
              </button>
            </div>
          </article>

          {/* --- TARJETA 3: IMPORTAR (ACTUALIZADA) --- */}
          <article className="card">
            <h4>Importar Factura (OCR)</h4>
            <p>Toma una foto o sube una imagen para detectar los datos automáticamente.</p>
            <div className="actions">
              {/* 👇 AQUÍ ESTÁ EL CAMBIO: Navegación a la nueva ruta */}
              <button onClick={() => navigate("/importar-factura")} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={18} /> Subir o Tomar Foto
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}