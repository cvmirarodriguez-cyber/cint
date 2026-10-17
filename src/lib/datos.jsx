import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';

const E = base44.entities;
const DatosCtx = createContext(null);

// Carga todo el set de datos una vez; el volumen de personal de terreno cabe holgado en memoria.
export function DatosProvider({ usuario, children }) {
  const [estado, setEstado] = useState({ cargando: true, trabajadores: [], obras: [], contratos: [], evaluaciones: [] });

  const recargar = useCallback(async () => {
    // El jefe de obra no tiene acceso a la base completa de personal: el servidor le devolvería vacío.
    const [trabajadores, obras, contratos, evaluaciones] = await Promise.all([
      usuario?.role === 'admin' ? E.Trabajador.list('nombre', 5000) : Promise.resolve([]),
      E.Obra.list('-created_date', 1000),
      E.Contrato.list('-created_date', 5000),
      E.Evaluacion.list('-created_date', 5000),
    ]);
    setEstado({ cargando: false, trabajadores, obras, contratos, evaluaciones });
  }, [usuario?.role]);

  useEffect(() => { recargar().catch(() => setEstado((s) => ({ ...s, cargando: false }))); }, [recargar]);

  const valor = useMemo(() => {
    const evalsPor = new Map();
    for (const e of estado.evaluaciones) {
      if (!evalsPor.has(e.trabajador_id)) evalsPor.set(e.trabajador_id, []);
      evalsPor.get(e.trabajador_id).push(e);
    }
    const esAdmin = usuario?.role === 'admin';
    const pendientes = estado.contratos.filter(
      (c) => c.estado === 'pendiente' && (esAdmin || (c.jefe_terreno_email || '').toLowerCase() === usuario?.email?.toLowerCase()),
    );
    return { ...estado, usuario, esAdmin, evalsPor, pendientes, recargar, E };
  }, [estado, usuario, recargar]);

  return <DatosCtx.Provider value={valor}>{children}</DatosCtx.Provider>;
}

export const useDatos = () => useContext(DatosCtx);
