export default function Footer() {
  return (
    <footer>
      <div className="container footer-content">
        <div className="footer-brand">
          <h3>ControlFac2</h3>
          <p>Sistema de gestión inteligente de facturas de parqueo.</p>
        </div>

        <div className="footer-links">
          <a href="#inicio">Inicio</a>
          <a href="#facturas">Facturas</a>
          <a href="#reportes">Reportes</a>
          <a href="#perfil">Perfil</a>
        </div>

        <div className="footer-socials">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="https://wa.me/50254122572" target="_blank" rel="noopener noreferrer" className="social-icon">
            <i className="fab fa-whatsapp"></i>
          </a>
          <a href="mailto:soporte@controlfac2.com" className="social-icon">
            <i className="far fa-envelope"></i>
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} ControlFac2 — Desarrollado con 💚 por Walter.</p>
      </div>
    </footer>
  );
}
