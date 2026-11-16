import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Loader2, LogOut, Receipt, ScanLine } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TemaToggle from '@/components/TemaToggle';
import { Aviso, Cargando, Marca } from '@/components/ui';
import { calcularMesa, clp, errorTexto, nuevoCodigo, nuevoId } from '@/lib/util';

export default function Inicio({ usuario }) {
  const [mesas, setMesas] = useState(null);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Mesa.list('-created_date', 50).then(setMesas).catch((e) => { setError(errorTexto(e)); setMesas([]); });
  }, []);

  const nueva = async () => {
    setCreando(true);
    try {
      const yo = { id: nuevoId(), nombre: (usuario.full_name || 'Yo').split(' ')[0] };
      const mesa = await base44.entities.Mesa.create({
        codigo: nuevoCodigo(),
        estado: 'armando',
        modo: 'items',
        propina_pct: 10,
        items: [],
        personas: [yo],
        organizador_persona_id: yo.id,
      });
      navigate(`/mesa/${mesa.id}`);
    } catch (e) {
      setError(errorTexto(e));
      setCreando(false);
    }
  };

  const nombre = (usuario.full_name || usuario.email || '').split(/[ @]/)[0];
  return (
    <div className="mx-auto max-w-md px-5 py-6">
      <header className="flex items-center justify-between">
        <Marca />
        <div className="flex items-center gap-1">
        <TemaToggle />
        <button className="rounded-full p-2 text-tinta-400 hover:bg-papel-oscuro" onClick={() => base44.auth.logout('/')} aria-label="Cerrar sesión"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <p className="mt-10 text-tinta-400">Hola{nombre ? `, ${nombre}` : ''}</p>
      <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.04em]">¿Dividimos una cuenta?</h1>

      {usuario.role !== 'admin' ? (
        <Aviso tipo="ambar">Tu cuenta aún no puede crear mesas. Pídele al administrador de la app que te habilite.</Aviso>
      ) : (
      <button onClick={nueva} disabled={creando} className="entra group mt-6 flex w-full items-center gap-4 rounded-2xl bg-bloque p-5 text-left text-bloque-texto ring-1 ring-white/5 active:scale-[.99]">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10">
          {creando ? <Loader2 className="h-6 w-6 animate-spin" /> : <ScanLine className="h-6 w-6" />}
        </span>
        <span className="flex-1">
          <b className="block text-lg tracking-tight">Nueva cuenta</b>
          <span className="text-sm text-bloque-texto/60">Escanea la boleta y la IA hace el resto</span>
        </span>
        <ArrowRight className="h-5 w-5 opacity-60 transition group-hover:translate-x-1" />
      </button>
      )}

      <Aviso>{error}</Aviso>

      <div className="mb-3 mt-10 flex items-baseline justify-between">
        <h2 className="etiqueta">Historial</h2>
        {mesas?.length > 0 && <span className="etiqueta">{mesas.length} mesas</span>}
      </div>
      {mesas === null ? <Cargando /> : mesas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-tinta-300 p-8 text-center text-sm text-tinta-400">
          <Receipt className="mx-auto mb-2 h-6 w-6" />
          Tus cuentas divididas aparecerán aquí.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {mesas.map((m) => {
            const f = new Date(m.created_date);
            const calc = calcularMesa(m);
            return (
              <li key={m.id}>
                <Link to={`/mesa/${m.id}`} className="flex items-stretch overflow-hidden rounded-2xl bg-papel-claro ring-1 ring-linea transition active:scale-[.99]">
                  <span className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-dashed border-linea">
                    <span className="num text-xl font-bold leading-none">{f.getDate()}</span>
                    <span className="etiqueta mt-1">{f.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')}</span>
                  </span>
                  <span className="min-w-0 flex-1 px-4 py-3.5">
                    <b className="block truncate tracking-tight">{m.restoran || 'Sin nombre'}</b>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-tinta-400">
                      <Estado estado={m.estado} /> {(m.personas || []).length} personas
                    </span>
                  </span>
                  <span className="flex items-center gap-1 pr-3">
                    <b className="num text-[15px]">{clp(calc.total)}</b>
                    <ChevronRight className="h-4 w-4 text-tinta-300" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Estado({ estado }) {
  const e = { armando: ['Armando', 'bg-tinta-300'], cobrando: ['Cobrando', 'bg-ambar'], cerrada: ['Pagada', 'bg-verde'] }[estado] || [estado, 'bg-tinta-300'];
  return <span className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${e[1]}`} />{e[0]}</span>;
}
