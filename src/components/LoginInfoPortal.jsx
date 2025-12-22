import React from "react";
import { X, LayoutGrid, Cpu, Smartphone, Globe, Shield, Rocket, CheckCircle, Info } from "lucide-react";

export default function LoginInfoPortal({ isOpen, onClose, view }) {
    if (!isOpen) return null;

    const PresentationContent = () => (
        <div className="info-content presentation">
            <header className="info-header">
                <Rocket className="icon-main" />
                <h2>ControlFAC</h2>
                <p>Herramienta Interna de Gestión Automatizada</p>
            </header>

            <div className="info-grid">
                <section className="info-section">
                    <h3><CheckCircle className="icon-small" /> El Objetivo</h3>
                    <p>Mejorar la calidad de vida del técnico en campo, automatizando el proceso manual para llevar un control anual y mensual preciso de gastos de parqueo.</p>
                </section>

                <section className="info-section">
                    <h3><LayoutGrid className="icon-small" /> Gestión Total (CRUD)</h3>
                    <ul className="info-list">
                        <li><strong>Visualizar:</strong> Historial completo en tiempo real.</li>
                        <li><strong>Editar:</strong> Corrige montos o descripciones antes del corte.</li>
                        <li><strong>Borrar:</strong> Elimina registros duplicados fácilmente.</li>
                    </ul>
                </section>

                <section className="info-section">
                    <h3><Smartphone className="icon-small" /> Funcionalidades Clave</h3>
                    <p><strong>Reimpresión SAT:</strong> Captura de NIT, Serie, DTE, Fecha y Monto para reimpresión legal.</p>
                    <p><strong>Recibos Municipales:</strong> Respaldo digital mediante fotos obligatorias para tickets no reimprimibles.</p>
                </section>

                <section className="info-section">
                    <h3><Shield className="icon-small" /> Seguridad</h3>
                    <p>Acceso seguro mediante cuenta corporativa Google bajo infraestructura de nube de alta disponibilidad.</p>
                </section>
            </div>
        </div>
    );

    const TechContent = () => (
        <div className="info-content tech">
            <header className="info-header">
                <Cpu className="icon-main" />
                <h2>Ficha Técnica</h2>
                <p>Especificaciones y Compatibilidad</p>
            </header>

            <div className="info-grid half">
                <section className="info-section">
                    <h3>Arquitectura</h3>
                    <ul className="spec-list">
                        <li><span>Tipo:</span> SPA (React 18 + Vite)</li>
                        <li><span>Base de Datos:</span> PostgreSQL</li>
                        <li><span>Auth:</span> Google OAuth 2.0 / JWT</li>
                        <li><span>Motor:</span> Tesseract.js (OCR)</li>
                    </ul>
                </section>

                <section className="info-section">
                    <h3>Compatibilidad</h3>
                    <ul className="spec-list">
                        <li><span>Android:</span> 8.0 (Oreo) o superior</li>
                        <li><span>iOS:</span> 13.0 o superior</li>
                        <li><span>Cámara:</span> Mínimo 5MP requeridos</li>
                        <li><span>Navegadores:</span> Chrome, Edge, Safari, Firefox</li>
                    </ul>
                </section>
            </div>

            <div className="warning-note">
                <Info size={16} />
                <p>Se requiere una conexión a internet estable para el procesamiento de imágenes y sincronización de datos.</p>
            </div>
        </div>
    );

    return (
        <div className="info-portal-overlay" onClick={onClose}>
            <div className="info-portal-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="info-scroll-container">
                    {view === "presentation" ? <PresentationContent /> : <TechContent />}
                </div>

                <footer className="info-portal-footer">
                    <p>© 2025 ControlFAC - Uso Interno</p>
                </footer>
            </div>
        </div>
    );
}
