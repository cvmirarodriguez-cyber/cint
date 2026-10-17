import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ClipboardCheck, Loader2, Search, ShieldAlert, X } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { AD, CARGOS, NOTAS, RECONTRATAR, cargoLabel, fecha, hoyISO, plano } from '@/lib/dominio';
import { formatearRut, limpiarRut } from '@/lib/rut';
import { Avatar, Encabezado, Medidor, Segmento, Vacio, colorNota, ease, useToast } from '@/components/ui';

const opciones = (obj) => Object.entries(obj).map(([value, o]) => ({ value, ...o }));

function Paso({ n, titulo, ayuda, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease, delay: n * 0.05 }} className="slab p-5 sm:p-6">
      <div className="mb-4 flex items-baseline gap-3">
        <span className="font-mono text-xs font-bold text-obra">{String(n).padStart(2, '0')}</span>
        <div>
          <h2 className="font-bold">{titulo}</h2>
          {ayuda && <p className="text-sm text-bone-500">{ayuda}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function SelectorTrabajador({ onElegir }) {
  const { trabajadores } = useDatos();
  const [q, setQ] = useState('');
  const res = useMemo(() => {
    const term = plano(q.trim());
    if (term.length < 2) return [];
    const rq = limpiarRut(q);
    return trabajadores.filter((t) => plano(t.nombre).includes(term) || (rq.length >= 3 && limpiarRut(t.rut).includes(rq))).slice(0, 8);
  }, [q, trabajadores]);
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bone-600" />
        <input autoFocus className="field pl-12" placeholder="Busca por nombre o RUT…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar trabajador" />
      </div>
      <ul className="mt-2 space-y-1">
        {res.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => onElegir(t)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[.05]">
              <Avatar nombre={t.nombre} size={34} />
              <span className="flex-1"><span className="block font-semibold">{t.nombre}</span><span className="font-mono text-xs text-bone-500">{formatearRut(t.rut)}</span></span>
            </button>
          </li>
        ))}
        {q.trim().length >= 2 && !res.length && <li className="px-3 py-3 text-sm text-bone-500">Sin resultados. <Link to="/trabajadores" className="text-obra-300 underline">Agrégalo en Personal</Link>.</li>}
      </ul>
    </div>
  );
}

function Formulario() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const avisar = useToast();
  const { E, usuario, esAdmin, trabajadores, obras, contratos, pendientes, recargar } = useDatos();

  const contratoInicial = contratos.find((c) => c.id === params.get('contrato'));
  const [trabajadorId, setTrabajadorId] = useState(contratoInicial?.trabajador_id || params.get('trabajador') || '');
  const [f, setF] = useState({
    obra_id: contratoInicial?.obra_id || '',
    cargo: contratoInicial?.cargo || '',
    fecha_termino: contratoInicial?.fecha_termino || hoyISO(),
    desempeno: 0,
    responsabilidad: 0,
    alcohol_drogas: 'sin_observaciones',
    recontratar: 'si',
    comentario: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(null);

  // El jefe de obra no carga la base de personal: los datos vienen del contrato.
  const t = trabajadores.find((x) => x.id === trabajadorId)
    ?? (contratoInicial && contratoInicial.trabajador_id === trabajadorId
      ? { id: contratoInicial.trabajador_id, nombre: contratoInicial.trabajador_nombre, rut: contratoInicial.trabajador_rut, cargo: contratoInicial.cargo }
      : null);
  const cargo = f.cargo || t?.cargo || 'jornal';
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const completo = t && f.desempeno && f.responsabilidad;

  const enviar = async (e) => {
    e.preventDefault();
    if (!completo) return;
    setGuardando(true);
    const obra = obras.find((o) => o.id === f.obra_id) ?? (contratoInicial?.obra_id === f.obra_id ? { nombre: contratoInicial.obra_nombre } : null);
    const contrato = contratoInicial?.trabajador_id === t.id ? contratoInicial
      : contratos.find((c) => c.trabajador_id === t.id && c.obra_id === f.obra_id && c.estado !== 'evaluado');
    try {
      const ev = await E.Evaluacion.create({
        ...f,
        cargo,
        trabajador_id: t.id,
        trabajador_nombre: t.nombre,
        trabajador_rut: t.rut,
        obra_nombre: obra?.nombre || '',
        contrato_id: contrato?.id || '',
        evaluador_nombre: usuario.full_name || usuario.email,
        comentario: f.comentario.trim(),
      });
      if (contrato) await E.Contrato.update(contrato.id, { estado: 'evaluado', evaluacion_id: ev.id, ...(esAdmin && !contrato.fecha_termino ? { fecha_termino: f.fecha_termino } : {}) });
      await recargar();
      setListo(t);
    } catch {
      avisar('No se pudo guardar la evaluación', 'bad');
    } finally {
      setGuardando(false);
    }
  };

  if (listo) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-center">
        <div>
          <motion.div initial={{ scale: 0.4, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-obra shadow-glow">
            <motion.svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="#0c0d0f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.25, ease }} />
            </motion.svg>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4, ease }}>
            <h1 className="display mt-8 text-3xl sm:text-4xl">Evaluación guardada</h1>
            <p className="mt-3 text-bone-400">{esAdmin ? `El historial de ${listo.nombre} quedó actualizado.` : `Gracias. La evaluación de ${listo.nombre} quedó registrada para el jefe de personal.`}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {pendientes.length > 0 && <Link to={`/evaluar?contrato=${pendientes[0].id}`} className="btn-primary">Siguiente pendiente ({pendientes.length})</Link>}
              {esAdmin && <Link to={`/trabajadores/${listo.id}`} className="btn-ghost">Ver ficha</Link>}
              <button onClick={() => navigate('/')} className="btn-ghost">{esAdmin ? 'Volver al panel' : 'Volver al inicio'}</button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!esAdmin && !contratoInicial) {
    return (
      <div className="mx-auto max-w-2xl">
        <Encabezado eyebrow="Término de contrato" titulo="Evaluar trabajador">
          Elige a quién evaluar. Solo aparecen los trabajadores de tus obras cuyo contrato terminó.
        </Encabezado>
        {pendientes.length ? (
          <ul className="space-y-2">
            {pendientes.map((c) => (
              <li key={c.id}>
                <Link to={`/evaluar?contrato=${c.id}`} className="slab slab-hover flex items-center gap-4 p-4">
                  <Avatar nombre={c.trabajador_nombre} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.trabajador_nombre}</span>
                    <span className="block truncate text-xs text-bone-500">{cargoLabel(c.cargo)} · {c.obra_nombre} · término {fecha(c.fecha_termino)}</span>
                  </span>
                  <span className="btn-primary shrink-0 px-3 py-2 text-sm">Evaluar</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Vacio icono={ClipboardCheck} titulo="No tienes evaluaciones pendientes">Cuando el jefe de personal marque un término de contrato en tu obra, aparecerá aquí.</Vacio>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mx-auto max-w-2xl">
      <Encabezado eyebrow="Término de contrato" titulo="Evaluar trabajador">
        Dos criterios, un control de alcohol y drogas, y un comentario breve. Toma menos de un minuto.
      </Encabezado>

      {!trabajadorId && pendientes.length > 0 && (
        <div className="mb-6">
          <p className="eyebrow mb-3">Pendientes ({pendientes.length})</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {pendientes.map((c) => (
              <button key={c.id} type="button" onClick={() => { setTrabajadorId(c.trabajador_id); setF((s) => ({ ...s, obra_id: c.obra_id, cargo: c.cargo || '', fecha_termino: c.fecha_termino || s.fecha_termino })); }} className="slab slab-hover flex shrink-0 items-center gap-3 px-3 py-2.5 text-left">
                <Avatar nombre={c.trabajador_nombre} size={32} />
                <span><span className="block text-sm font-semibold">{c.trabajador_nombre}</span><span className="text-xs text-bone-500">{c.obra_nombre}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Paso n={1} titulo="Trabajador">
          <AnimatePresence mode="wait" initial={false}>
            {t ? (
              <motion.div key="t" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4">
                <Avatar nombre={t.nombre} size={52} />
                <div className="flex-1">
                  <p className="text-lg font-bold">{t.nombre}</p>
                  <p className="font-mono text-sm text-bone-500">{formatearRut(t.rut)} · {cargoLabel(t.cargo)}</p>
                </div>
                {esAdmin && <button type="button" onClick={() => setTrabajadorId('')} className="rounded-lg p-2 text-bone-500 hover:bg-white/5" aria-label="Cambiar trabajador"><X className="h-5 w-5" /></button>}
              </motion.div>
            ) : (
              <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SelectorTrabajador onElegir={(x) => setTrabajadorId(x.id)} />
              </motion.div>
            )}
          </AnimatePresence>
        </Paso>

        <Paso n={2} titulo="Obra y contrato">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="ev-obra">Obra</label>
              <select id="ev-obra" className="field disabled:opacity-70" value={f.obra_id} disabled={!esAdmin && !!contratoInicial} onChange={(e) => set('obra_id')(e.target.value)}>
                <option value="">Selecciona la obra…</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}{o.codigo ? ` (${o.codigo})` : ''}</option>)}
                {contratoInicial && !obras.some((o) => o.id === contratoInicial.obra_id) && <option value={contratoInicial.obra_id}>{contratoInicial.obra_nombre}</option>}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ev-cargo">Cargo en la obra</label>
              <select id="ev-cargo" className="field" value={cargo} onChange={(e) => set('cargo')(e.target.value)}>
                {CARGOS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ev-fecha">Fecha de término</label>
              <input id="ev-fecha" type="date" className="field" value={f.fecha_termino} max={hoyISO()} onChange={(e) => set('fecha_termino')(e.target.value)} />
            </div>
          </div>
          {contratoInicial && <p className="mt-3 text-xs text-bone-500">Contrato en {contratoInicial.obra_nombre} · término {fecha(contratoInicial.fecha_termino)}</p>}
        </Paso>

        <Paso n={3} titulo="Desempeño" ayuda="Calidad del trabajo, rendimiento, conocimiento del oficio.">
          <Medidor nombre="Desempeño" valor={f.desempeno} onChange={set('desempeno')} />
          <p className="mt-3 h-5 text-sm font-semibold" style={{ color: colorNota(f.desempeno || null) }}>{NOTAS[f.desempeno]}</p>
        </Paso>

        <Paso n={4} titulo="Responsabilidad" ayuda="Puntualidad, asistencia, cumplimiento de normas de seguridad.">
          <Medidor nombre="Responsabilidad" valor={f.responsabilidad} onChange={set('responsabilidad')} />
          <p className="mt-3 h-5 text-sm font-semibold" style={{ color: colorNota(f.responsabilidad || null) }}>{NOTAS[f.responsabilidad]}</p>
        </Paso>

        <Paso n={5} titulo="Alcohol y drogas" ayuda="Confidencial: solo la ve el jefe de personal.">
          <Segmento nombre="Alcohol y drogas" opciones={opciones(AD)} valor={f.alcohol_drogas} onChange={set('alcohol_drogas')} />
          <AnimatePresence>
            {f.alcohol_drogas !== 'sin_observaciones' && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex items-start gap-2 overflow-hidden text-sm text-hivis">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Describe brevemente lo ocurrido en el comentario (fecha, situación, si hubo control).
              </motion.p>
            )}
          </AnimatePresence>
        </Paso>

        <Paso n={6} titulo="¿Lo volverías a contratar?">
          <Segmento nombre="Recontratar" opciones={opciones(RECONTRATAR)} valor={f.recontratar} onChange={set('recontratar')} />
        </Paso>

        <Paso n={7} titulo="Comentario" ayuda="Opcional. Lo que el próximo jefe de obra debería saber.">
          <textarea className="field min-h-[110px] resize-y" maxLength={500} value={f.comentario} onChange={(e) => set('comentario')(e.target.value)} placeholder="Ej: buen enfierrador, rápido y ordenado. Llegó tarde algunos lunes." />
          <p className="mt-1 text-right font-mono text-xs text-bone-600">{f.comentario.length}/500</p>
        </Paso>
      </div>

      <div className="sticky bottom-24 z-30 mt-6 md:bottom-6">
        <button className="btn-primary w-full py-4 text-base" disabled={!completo || guardando}>
          {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Guardar evaluación</>}
        </button>
      </div>
    </form>
  );
}

// Espera los datos y reinicia el formulario cuando cambia el contrato o trabajador de la URL.
export default function Evaluar() {
  const { cargando } = useDatos();
  const [params] = useSearchParams();
  if (cargando) return null;
  return <Formulario key={params.toString()} />;
}
