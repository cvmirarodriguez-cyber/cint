import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { DatosProvider } from '@/lib/datos';
import { ToastProvider } from '@/components/ui';
import Shell from '@/components/Shell';
import Login from '@/pages/Login';
import Panel from '@/pages/Panel';
import Trabajadores from '@/pages/Trabajadores';
import Ficha from '@/pages/Ficha';
import Evaluar from '@/pages/Evaluar';
import Obras from '@/pages/Obras';
import ObraDetalle from '@/pages/ObraDetalle';
import Importar from '@/pages/Importar';
import Equipo from '@/pages/Equipo';
import AccesoPendiente from '@/pages/AccesoPendiente';
import { esGerente } from '@/lib/dominio';
import PanelJefe from '@/pages/PanelJefe';
import MisEvaluaciones from '@/pages/MisEvaluaciones';
import Recomendar from '@/pages/Recomendar';
import Asistente from '@/pages/Asistente';
import Legal from '@/pages/Legal';
import Reportes from '@/pages/Reportes';
import MisObras from '@/pages/MisObras';

// Entrada de cada sección con una animación CSS. No espera a que la página anterior termine de
// salir (antes AnimatePresence mode="wait" podía quedarse trabado y dejar la sección en blanco).
function Pagina({ children }) {
  return <div className="pagina-entra">{children}</div>;
}

export default function App() {
  const [usuario, setUsuario] = useState(undefined);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me()
      .then(async (u) => {
        // Un invitado como gerente o jefe de personal de obra recibe su cargo la primera vez que entra.
        if (u?.role === 'admin' && !(u.perfil || u.data?.perfil)) {
          const r = await base44.functions.invoke('reclamar-acceso', {}).catch(() => null);
          if (r?.data?.perfil) u = { ...u, perfil: r.data.perfil };
        }
        setUsuario(u);
      })
      .catch(() => setUsuario(null));
  }, []);

  // Políticas públicas: se abren sin sesión (enlace de la entrada y de las tiendas de apps).
  if (location.pathname.startsWith('/legal')) {
    return (
      <Routes>
        <Route path="/legal/:doc?" element={<Legal />} />
      </Routes>
    );
  }

  if (usuario === undefined) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-[marquee_1s_linear_infinite] bg-obra" />
        </div>
      </div>
    );
  }
  if (!usuario) return <Login />;
  // La app es pública: una cuenta nueva no ve datos hasta que el jefe de personal de obra la aprueba.
  if (usuario.suspendido || usuario.data?.suspendido) return <AccesoPendiente usuario={usuario} suspendido />;
  if (usuario.role !== 'admin' && !(usuario.acceso || usuario.data?.acceso)) return <AccesoPendiente usuario={usuario} />;
  if (usuario.role === 'admin' && !(usuario.perfil || usuario.data?.perfil)) return <AccesoPendiente usuario={usuario} />;

  const admin = usuario.role === 'admin';
  return (
    <ToastProvider>
      <DatosProvider usuario={usuario}>
        <Shell>
            {admin ? (
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Pagina><Panel /></Pagina>} />
                <Route path="/trabajadores" element={<Pagina><Trabajadores /></Pagina>} />
                <Route path="/trabajadores/:id" element={<Pagina><Ficha /></Pagina>} />
                <Route path="/evaluar" element={<Pagina><Evaluar /></Pagina>} />
                <Route path="/obras" element={<Pagina><Obras /></Pagina>} />
                <Route path="/obras/:id" element={<Pagina><ObraDetalle /></Pagina>} />
                {esGerente(usuario) ? <Route path="/importar" element={<Pagina><Importar /></Pagina>} /> : null}
                {esGerente(usuario) ? <Route path="/reportes" element={<Pagina><Reportes /></Pagina>} /> : null}
                <Route path="/equipo" element={<Pagina><Equipo /></Pagina>} />
                <Route path="/recomendar" element={<Pagina><Recomendar /></Pagina>} />
                <Route path="/asistente" element={<Pagina><Asistente /></Pagina>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            ) : (
              // Jefe de terreno: solo evalúa a su gente y ve sus propias evaluaciones.
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Pagina><PanelJefe /></Pagina>} />
                <Route path="/mis-obras" element={<Pagina><MisObras /></Pagina>} />
                <Route path="/evaluar" element={<Pagina><Evaluar /></Pagina>} />
                <Route path="/mis-evaluaciones" element={<Pagina><MisEvaluaciones /></Pagina>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )}
        </Shell>
      </DatosProvider>
    </ToastProvider>
  );
}