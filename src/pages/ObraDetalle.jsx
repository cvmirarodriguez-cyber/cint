import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ClipboardCheck, Flag, Pencil, Search, UserPlus, X } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { cargoLabel, fecha, hoyISO, plano, resumen } from '@/lib/dominio';
import { formatearRut, limpiarRut } from '@/lib/rut';
import { Capa, Anillo, Avatar, Chip, Vacio, ease, useToast } from '@/components/ui';
import { FormObra } from '@/pages/Obras';

function AgregarCuadrilla({ obra, onClose }) {
  const { E, trabajadores, contratos, evalsPor, recargar } = useDatos();
  const avisar = useToast();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(new Set());
  const [inicio, setInicio] = useState(hoyISO());
  const [guardando, setGuardando] = useState(false);

  const ocupados = useMemo(() => new Set(contratos.filter((c) => c.obra_id === obra.id && c.estado === 'vigente').map((c) => c.trabajador_id)), [contratos, obra.id]);
  const res = useMemo(() => {
    const term = plano(q.trim());
    const rq = limpiarRut(q);
    return trabajadores.filter((t) => !ocupados.has(t.id)).filter((t) => !term || plano(t.nombre).includes(term) || (rq.length >= 3 && limpiarRut(t.rut).includes(rq))).slice(0, 60);
  }, [q, trabajadores, ocupados]);

  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const guardar = async () => {
    setGuardando(true);
    try {
      await E.Contrato.bulkCreate(trabajadores.filter((t) => sel.has(t.id)).map((t) => ({
        trabajador_id: t.id, trabajador_nombre: t.nombre, trabajador_rut: t.rut, cargo: t.cargo,
        obra_id: obra.id, obra_nombre: obra.nombre, jefe_terreno_email: obra.jefe_terreno_email || '',
        fecha_inicio: inicio, estado: 'vigente',
      })));
      await recargar();
      avisar(`${sel.size} ${sel.size === 1 ? 'trabajador agregado' : 'trabajadores agregados'}`);
      onClose();
    } catch {
      avisar('No se pudo agregar', 'bad');
      setGuardando(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.35, ease }}
        className="slab flex max-h-[92dvh] w-full max-w-lg flex-col rounded-b-none sm:rounded-2xl">
        <div className="space-y-3 border-b border-white/[.06] p-5">
          <div className="flex items-center justify-between">
            <h2 className="display text-2xl">Sumar a la cuadrilla</h2>
            <button onClick={onClose} className="rounded-lg p-2 text-bone-500 hover:bg-white/5" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bone-600" />
            <input autoFocus className="field pl-12" placeholder="Nombre o RUT…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {res.map((t) => {
            const r = resumen(evalsPor.get(t.id));
            const on = sel.has(t.id);
            return (
              <li key={t.id}>
                <button onClick={() => toggle(t.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${on ? 'bg-obra/10' : 'hover:bg-white/[.04]'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-md border transition-colors ${on ? 'border-obra bg-obra text-ink' : 'border-white/20'}`}>{on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{t.nombre}</span>
                    <span className="font-mono text-xs text-bone-500">{formatearRut(t.rut)} · {cargoLabel(t.cargo)}</span>
                  </span>
                  {r.n > 0 && <Anillo valor={r.promedio} size={34} grosor={3} />}
                </button>
              </li>
            );
          })}
          {!res.length && <li className="px-3 py-8 text-center text-sm text-bone-500">Sin resultados.</li>}
        </ul>
        <div className="flex items-end gap-3 border-t border-white/[.06] p-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div className="flex-1">
            <label className="label text-xs" htmlFor="ag-inicio">Inicio de contrato</label>
            <input id="ag-inicio" type="date" className="field py-2.5" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <button onClick={guardar} className="btn-primary" disabled={!sel.size || guardando}>Agregar {sel.size || ''}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ObraDetalle() {
  const { id } = useParams();
  const { E, obras, contratos, evalsPor, cargando, recargar } = useDatos();
  const avisar = useToast();
  const [agregar, setAgregar] = useState(false);
  const [editar, setEditar] = useState(false);
  const [procesando, setProcesando] = useState(null);
  const obra = obras.find((o) => o.id === id);
  if (cargando) return null;
  if (!obra) return <Vacio titulo="Obra no encontrada"><Link to="/obras" className="text-obra-300 underline">Volver</Link></Vacio>;

  const cs = contratos.filter((c) => c.obra_id === obra.id);
  const grupos = [
    { estado: 'pendiente', titulo: 'Por evaluar', tono: 'obra' },
    { estado: 'vigente', titulo: 'Vigentes', tono: 'muted' },
    { estado: 'evaluado', titulo: 'Evaluados', tono: 'ok' },
  ];

  const terminar = async (lista) => {
    setProcesando(lista.length > 1 ? 'todos' : lista[0].id);
    try {
      await Promise.all(lista.map((c) => E.Contrato.update(c.id, { estado: 'pendiente', fecha_termino: hoyISO(), jefe_terreno_email: obra.jefe_terreno_email || c.jefe_terreno_email || '' })));
      await recargar();
      avisar(lista.length > 1 ? `${lista.length} contratos terminados` : 'Contrato terminado: queda pendiente de evaluar');
    } catch {
      avisar('No se pudo actualizar', 'bad');
    } finally {
      setProcesando(null);
    }
  };
  const vigentes = cs.filter((c) => c.estado === 'vigente');

  return (
    <div>
      <Link to="/obras" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-bone-500 transition-colors hover:text-bone"><ArrowLeft className="h-4 w-4" /> Obras</Link>

      <header className="slab blueprint relative mb-8 overflow-hidden p-6 sm:p-8">
        <div className="hazard absolute inset-x-0 top-0 h-1.5" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">{obra.codigo || 'Obra'} · {obra.ubicacion || 'Sin ubicación'}</p>
            <h1 className="display text-3xl sm:text-5xl">{obra.nombre}</h1>
            <p className="mt-3 text-sm text-bone-400">
              Jefe de obra: <b className="text-bone">{obra.jefe_terreno_nombre || '—'}</b>{obra.jefe_terreno_email && <span className="text-bone-500"> · {obra.jefe_terreno_email}</span>}
            </p>
            <p className="mt-1 text-sm text-bone-500">{fecha(obra.fecha_inicio)} → {fecha(obra.fecha_termino)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setEditar(true)} className="btn-ghost"><Pencil className="h-4 w-4" /> Editar</button>
            <button onClick={() => setAgregar(true)} className="btn-primary"><UserPlus className="h-4 w-4" /> Sumar personal</button>
          </div>
        </div>
      </header>

      {!cs.length ? (
        <Vacio icono={UserPlus} titulo="La cuadrilla está vacía">Suma al personal que trabaja en esta obra. Al terminar cada contrato, márcalo y quedará pendiente de evaluación.</Vacio>
      ) : (
        <div className="space-y-8">
          {grupos.map((g) => {
            const filas = cs.filter((c) => c.estado === g.estado);
            if (!filas.length) return null;
            return (
              <section key={g.estado}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">{g.titulo} <Chip tono={g.tono}>{filas.length}</Chip></h2>
                  {g.estado === 'vigente' && filas.length > 1 && (
                    <button onClick={() => window.confirm(`¿Terminar los ${filas.length} contratos vigentes de ${obra.nombre}?`) && terminar(vigentes)} disabled={!!procesando} className="text-sm font-semibold text-bone-500 underline-offset-4 hover:text-obra-300 hover:underline">
                      Terminar todos
                    </button>
                  )}
                </div>
                <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <AnimatePresence initial={false}>
                    {filas.map((c) => {
                      const r = resumen(evalsPor.get(c.trabajador_id));
                      return (
                        <motion.li key={c.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25, ease }} className="slab flex items-center gap-3 p-3.5">
                          <Link to={`/trabajadores/${c.trabajador_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <Avatar nombre={c.trabajador_nombre} size={40} alerta={!!r.alerta} />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{c.trabajador_nombre}</span>
                              <span className="block truncate text-xs text-bone-500">{cargoLabel(c.cargo)} · {c.estado === 'vigente' ? `desde ${fecha(c.fecha_inicio)}` : `término ${fecha(c.fecha_termino)}`}</span>
                            </span>
                          </Link>
                          {c.estado === 'vigente' && (
                            <button onClick={() => terminar([c])} disabled={procesando === c.id} className="btn-ghost shrink-0 px-3 py-2 text-sm"><Flag className="h-4 w-4" /> Terminar</button>
                          )}
                          {c.estado === 'pendiente' && (
                            <Link to={`/evaluar?contrato=${c.id}`} className="btn-primary shrink-0 px-3 py-2 text-sm"><ClipboardCheck className="h-4 w-4" /> Evaluar</Link>
                          )}
                          {c.estado === 'evaluado' && <Check className="h-5 w-5 shrink-0 text-ok" />}
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Capa><AnimatePresence>{agregar && <AgregarCuadrilla obra={obra} onClose={() => setAgregar(false)} />}</AnimatePresence></Capa>
      <FormObra abierto={editar} obra={obra} onClose={() => setEditar(false)} key={editar ? 'e' : 'x'} />
    </div>
  );
}
