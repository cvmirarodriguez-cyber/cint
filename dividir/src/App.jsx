import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Cargando } from '@/components/ui';
import Login from '@/pages/Login';
import Inicio from '@/pages/Inicio';
import MesaOrganizador from '@/pages/MesaOrganizador';
import Invitado from '@/pages/Invitado';

export default function App() {
  const location = useLocation();
  const publica = location.pathname.startsWith('/m/');
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => {
    if (publica) return;
    base44.auth.me().then(setUsuario).catch(() => setUsuario(null));
  }, [publica]);

  // Los invitados entran por el link/QR de la mesa sin crear cuenta.
  if (publica) {
    return (
      <Routes>
        <Route path="/m/:codigo" element={<Invitado />} />
      </Routes>
    );
  }
  if (usuario === undefined) return <Cargando />;
  if (!usuario) return <Login />;

  return (
    <Routes>
      <Route path="/" element={<Inicio usuario={usuario} />} />
      <Route path="/mesa/:id" element={<MesaOrganizador usuario={usuario} />} />
      <Route path="*" element={<Inicio usuario={usuario} />} />
    </Routes>
  );
}
