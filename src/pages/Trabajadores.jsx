import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HardHat, Plus, Search, X } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { CARGOS, ESPECIALIDADES, VEREDICTO, cargoLabel, plano, resumen } from '@/lib/dominio';
import { formatearRut, limpiarRut, normalizarRut, rutValido } from '@/lib/rut';
import { Capa, Anillo, Avatar, Chip, Encabezado, Vacio, ease, useToast } from '@/components/ui';

const FILTROS = [{ value: '', label: 'Todos' }, ...CARGOS.map((c) => ({ value: c.value, label: c.corto }))];

export function NuevoTrabajador({ abierto, onClose, onCreado, rutInicial = '' }) {
  const { E, trabajadores, recargar } = useDatos();
  const avisar = useToast();
  const [f, setF] = useState({ nombre: '', rut: rutInicial, cargo: 'jornal', especialidad: '', telefono: '' });
  const [guardando, setGuardando] = useState(false);
  const rutOk = rutValido(f.rut);
  const duplicado = rutOk && trabajadores.find((t) => limpiarRut(t.rut) === limpiarRut(f.rut));

  const guardar = async (e) => {
    e.preventDefault();
    if (!rutOk || duplicado) return;
    setGuardando(true);
    try {
      const t = await E.Trabajador.create({ ...f, nombre: f.nombre.trim(), rut: normalizarRut(f.rut) });
      await recargar();
      avisar('Trabajador agregado');
      onCreado?.(t);
      onClose();
    } catch {
      avisar('No se pudo guardar', 'bad');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Capa>
    <AnimatePresence>
      {abierto && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.form
            onSubmit={guardar}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.35, ease }}
            className="slab w-full max-w-lg space-y-4 rounded-b-none p-6 sm:rounded-2xl"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="display text-2xl">Nuevo trabajador</h2>
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-bone-500 hover:bg-white/5" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </div>
            <div>
              <label className="label" htmlFor="nt-nombre">Nombre completo</label>
              <input id="nt-nombre" className="field" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="nt-rut">RUT</label>
              <input id="nt-rut" className="field font-mono" inputMode="text" placeholder="12.345.678-9" value={f.rut} onChange={(e) => setF({ ...f, rut: formatearRut(e.target.value) })} required />
              {f.rut.length > 3 && !rutOk && <p className="mt-1.5 text-sm text-alerta">RUT inválido (revisa el dígito verificador)</p>}
              {duplicado && <p className="mt-1.5 text-sm text-hivis">Ya existe: <Link className="underline" to={`/trabajadores/${duplicado.id}`}>{duplicado.nombre}</Link></p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="nt-cargo">Cargo</label>
                <select id="nt-cargo" className="field" value={f.cargo} onChange={(e) => setF({ ...f, cargo: e.target.value })}>
                  {CARGOS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="nt-esp">Especialidad</label>
                <select id="nt-esp" className="field" value={f.especialidad} onChange={(e) => setF({ ...f, especialidad: e.target.value })}>
                  <option value="">—</option>
                  {ESPECIALIDADES.map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="nt-tel">Teléfono <span className="font-normal text-bone-600">(opcional)</span></label>
              <input id="nt-tel" className="field" inputMode="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
            </div>
            <button className="btn-primary w-full" disabled={guardando || !rutOk || !!duplicado || !f.nombre.trim()}>Guardar</button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
    </Capa>
  );
}

export default function Trabajadores() {
  const { trabajadores, evalsPor, cargando } = useDatos();
  const [q, setQ] = useState('');
  const [cargo, setCargo] = useState('');
  const [nuevo, setNuevo] = useState(false);

  const filas = useMemo(() => {
    const term = plano(q.trim());
    const rutQ = limpiarRut(q);
    return trabajadores
      .filter((t) => !cargo || t.cargo === cargo)
      .filter((t) => !term || plano(t.nombre).includes(term) || (rutQ.length >= 3 && limpiarRut(t.rut).includes(rutQ)))
      .map((t) => ({ t, r: resumen(evalsPor.get(t.id)) }));
  }, [trabajadores, evalsPor, q, cargo]);

  return (
    <div>
      <Encabezado
        eyebrow={`${trabajadores.length} personas en la base`}
        titulo="Personal de terreno"
        accion={<button onClick={() => setNuevo(true)} className="btn-primary"><Plus className="h-4 w-4" /> Agregar</button>}
      >
        Busca por nombre o RUT antes de contratar: verás su historial en todas las obras.
      </Encabezado>

      <div className="sticky top-[60px] z-30 -mx-4 mb-5 space-y-3 bg-ink/85 px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bone-600" />
          <input className="field pl-12" placeholder="Nombre o RUT…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar trabajador" />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          {FILTROS.map((o) => (
            <button key={o.value} onClick={() => setCargo(o.value)} className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${cargo === o.value ? 'text-ink' : 'text-bone-400 hover:text-bone'}`}>
              {cargo === o.value && <motion.span layoutId="filtro-cargo" className="absolute inset-0 rounded-full bg-bone" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span className="relative">{o.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!cargando && !filas.length ? (
        <Vacio icono={HardHat} titulo={q ? 'Sin resultados' : 'Aún no hay personal'}>
          {q ? (rutValido(q) ? <button onClick={() => setNuevo(true)} className="mt-2 font-semibold text-obra-300 underline">Agregar a {formatearRut(q)}</button> : 'Prueba con otro nombre o RUT.') : 'Agrega trabajadores o importa la base actual.'}
        </Vacio>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {filas.slice(0, 300).map(({ t, r }, i) => (
            <motion.li key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease, delay: Math.min(i, 12) * 0.025 }}>
              <Link to={`/trabajadores/${t.id}`} className="slab slab-hover flex items-center gap-4 p-4">
                <Avatar nombre={t.nombre} alerta={!!r.alerta} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{t.nombre}</p>
                  <p className="truncate font-mono text-xs text-bone-500">{formatearRut(t.rut)} · {cargoLabel(t.cargo)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip tono={VEREDICTO[r.veredicto].tono}>{VEREDICTO[r.veredicto].label}</Chip>
                    {r.n > 0 && <Chip>{r.n} {r.n === 1 ? 'evaluación' : 'evaluaciones'}</Chip>}
                  </div>
                </div>
                <Anillo valor={r.promedio} size={54} grosor={5} />
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
      {filas.length > 300 && <p className="mt-4 text-center text-sm text-bone-500">Mostrando 300 de {filas.length}. Afina la búsqueda.</p>}

      <NuevoTrabajador abierto={nuevo} onClose={() => setNuevo(false)} rutInicial={rutValido(q) ? formatearRut(q) : ''} key={nuevo ? 'a' : 'c'} />
    </div>
  );
}
