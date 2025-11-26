// ✅ src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Facturas from "./pages/Facturas";
import NuevaFactura from "./pages/NuevaFactura";
import MisFacturas from "./pages/MisFacturas";
import DetalleFactura from "./pages/DetalleFactura";
import ImportarFactura from "./pages/ImportarFactura"; // 👈 1. NUEVA IMPORTACIÓN AQUÍ
import Reportes from "./pages/Reportes";
import Perfil from "./pages/Perfil";
import Login from "./pages/Login";

// 🧩 --- Componente para rutas privadas ---
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/" replace state={{ from: location }} />
  );
}

// 🧩 --- Componente para rutas públicas ---
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const redirectTo = location.state?.from?.pathname || "/perfil";
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

// 🧠 --- Componente principal ---
export default function App() {
  const { isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-turquesa-neon">
        Cargando...
      </div>
    );
  }

  return (
    <BrowserRouter>
      {isAuthenticated && <Navbar />}

      <main className="main">
        <Routes>
          {/* 🔐 Pública: LOGIN */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* 🔒 Privadas */}
          <Route
            path="/perfil"
            element={
              <PrivateRoute>
                <Perfil />
              </PrivateRoute>
            }
          />

          <Route
            path="/facturas"
            element={
              <PrivateRoute>
                <Facturas />
              </PrivateRoute>
            }
          />

          <Route
            path="/nueva-factura"
            element={
              <PrivateRoute>
                <NuevaFactura />
              </PrivateRoute>
            }
          />

          <Route
            path="/mis-facturas"
            element={
              <PrivateRoute>
                <MisFacturas />
              </PrivateRoute>
            }
          />

          <Route
            path="/factura/:id"
            element={
              <PrivateRoute>
                <DetalleFactura />
              </PrivateRoute>
            }
          />

          {/* 👇 2. NUEVA RUTA PARA IMPORTAR/OCR */}
          <Route
            path="/importar-factura"
            element={
              <PrivateRoute>
                <ImportarFactura />
              </PrivateRoute>
            }
          />

          <Route
            path="/reportes"
            element={
              <PrivateRoute>
                <Reportes />
              </PrivateRoute>
            }
          />

          {/* 🌐 Redirección general */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/perfil" : "/"} replace />}
          />
        </Routes>
      </main>
    </BrowserRouter>
  );
}