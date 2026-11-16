import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Plus, Receipt } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Aviso, Cargando, Marca } from '@/components/ui';
import { calcularMesa, clp, errorTexto, nuevoCodigo, nuevoId } from '@/lib/util';

const ESTADO = { armando: 'Armando', cobrando: 'Cobrando', cerrada: 'Cerrada' };

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

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <header className="flex items-center justify-between">
        <Marca />
        <button className="rounded-full p-2 text-tinta-400 hover:bg-stone-100" onClick={() => base44.auth.logout('/')} aria-label="Cerrar sesión"><LogOut className="h-5 w-5" /></button>
      </header>

      <button onClick={nueva} disabled={creando} className="entra mt-8 flex w-full items-center gap-4 rounded-3xl bg-hoja p-5 text-left text-crema shadow-ticket active:scale-[.99]">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-aji text-white"><Plus className="h-7 w-7" /></span>
        <span>
          <b className="block font-display text-2xl">Nueva cuenta</b>
          <span className="text-sm text-crema/80">Saca una foto a la boleta y listo</span>
        </span>
      </button>

      <Aviso>{error}</Aviso>

      <h2 className="etiqueta mb-3 mt-8">Tus mesas</h2>
      {mesas === null ? <Cargando /> : mesas.length === 0 ? (
        <p className="rounded-3xl border-2 border-dashed border-stone-200 p-8 text-center text-tinta-400">Aún no has dividido ninguna cuenta.</p>
      ) : (
        <ul className="space-y-2">
          {mesas.map((m) => (
            <li key={m.id}>
              <Link to={`/mesa/${m.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-stone-100 active:bg-stone-50">
                <Receipt className="h-5 w-5 text-tinta-300" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{m.restoran || 'Sin nombre'}</b>
                  <span className="text-sm text-tinta-400">{new Date(m.created_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · {(m.personas || []).length} personas · {ESTADO[m.estado] || m.estado}</span>
                </span>
                <b className="tabular-nums">{clp(calcularMesa(m).total)}</b>
                <ChevronRight className="h-4 w-4 text-tinta-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
