import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./NuevaFactura.css";

export default function NuevaFactura() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fecha: "",
    nit_cliente: "",
    nit_emisor: "",
    serie: "",
    dte: "",
    punto_servicio: "",
    motivo_visita: "",
    tecnico: "",
    cuenta: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("facturas").insert([formData]);
    if (error) {
      alert("❌ Error al guardar: " + error.message);
    } else {
      alert("✅ Factura guardada correctamente");
      navigate("/facturas");
    }
  };

  return (
    <section className="nueva-factura-section">
      <div className="nueva-factura-container">
        {/* ✖ Botón cerrar */}
        <button className="close-btn" onClick={() => navigate("/facturas")}>
          ✖
        </button>

        <h3>Nueva Factura</h3>

        <form onSubmit={handleSubmit} className="nueva-factura-form">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="nueva-factura-group">
              <label>{key.replace("_", " ").toUpperCase()}</label>
              <input
                type={key === "fecha" ? "date" : "text"}
                name={key}
                value={value}
                onChange={handleChange}
                required
              />
            </div>
          ))}

          <div className="nueva-factura-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate("/facturas")}
            >
              Cancelar
            </button>
            <button type="submit" className="save-btn">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
