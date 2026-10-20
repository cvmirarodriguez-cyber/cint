import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Building2, ClipboardCheck, PartyPopper } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { cargoLabel, fecha, nota } from '@/lib/dominio';
import { formatearRut } from '@/lib/rut';
import { Avatar, Contador, Tilt, Vacio, colorNota, ease, item, lista } from '@/components/ui';

const Obra3D = lazy(() => import('@/components/Obra3D'));

// Inicio del jefe de terreno: solo lo que tiene que evaluar y lo que ya evaluó.
export default function PanelJefe() {
  const { usuario, cargando, obras, pendientes, evaluaciones } = useDatos();
  const nombre = (usuario.full_name || '').split(' ')[0];

  const grupos = useMemo(() => {
    const m = new Map();
    for (const c of pendientes) {
      if (!m.has(c.obra_id)) m.set(c.obra_id, { obra: c.obra_nombre, items: [] });
      m.get(c.obra_id).items.push(c);
    }
    return [...m.values()];
  }, [pendientes]);

  return (
    <div>
      <section className="slab blueprint relative mb-6 min-h-[340px] overflow-hidden rounded-3xl">
        <Suspense fallback={null}>
          <Obra3D className="absolute inset-x-0 bottom-0 h-[230px] sm:inset-y-0 sm:left-auto sm:right-[-6%] sm:h-auto sm:w-[62%]" camara={[12.5, 6, 14.5]} />
        </Suspense>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-700 from-40% via-ink-700/50 via-60% to-transparent sm:bg-gradient-to-r sm:from-25% sm:via-45% sm:via-ink-700/60 sm:to-70%" />
        <div className="relative z-10 max-w-lg p-6 pb-[210px] sm:p-10">
          <p className="eyebrow mb-3">Jefe de terreno{obras.length ? ` · ${obras.map((o) => o.nombre).join(', ')}` : ''}</p>
          <h1 className="display break-words text-4xl sm:text-5xl">Hola{nombre ? `, ${nombre}` : ''}.</h1>
          <p className="mt-4 text-bone-400">
            {pendientes.length
              ? <>Tienes <b className="text-obra-300">{pendientes.length} {pendientes.length === 1 ? 'trabajador' : 'trabajadores'}</b> que terminaron contrato y esperan tu evaluación.</>
              : 'No tienes evaluaciones pendientes. Buen trabajo.'}
          </p>
          {pendientes.length > 0 && (
            <Link to={`/evaluar?contrato=${pendientes[0].id}`} className="btn-primary mt-6">
              <ClipboardCheck className="h-4 w-4" /> Empezar a evaluar
            </Link>
          )}
        </div>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4">
        {[[pendientes.length, 'Por evaluar', 'text-obra'], [evaluaciones.length, 'Evaluadas por ti', 'text-ok']].map(([n, l, c], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.05 + i * 0.05 }}>
            <Tilt className="slab rounded-2xl p-4 sm:p-5" max={6}>
              <p className="eyebrow">{l}</p>
              <p className={`display mt-3 text-4xl sm:text-5xl ${c}`}><Contador valor={n} /></p>
            </Tilt>
          </motion.div>
        ))}
      </div>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">
        <span className="h-2 w-2 rounded-full bg-obra shadow-[0_0_10px_#FF5F1F]" /> Por evaluar
      </h2>
      {!cargando && !grupos.length ? (
        <Vacio icono={PartyPopper} titulo="Todo al día">
          Cuando el jefe de personal de obra marque el término de contrato de alguien de tu obra, aparecerá aquí.
        </Vacio>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <section key={g.obra}>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-bone-300"><Building2 className="h-4 w-4 text-bone-500" />{g.obra}</p>
              <motion.ul variants={lista} initial="hidden" animate="show" className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {g.items.map((c) => (
                  <motion.li key={c.id} variants={item}>
                    <Link to={`/evaluar?contrato=${c.id}`} className="slab slab-hover group flex items-center gap-4 p-4">
                      <Avatar nombre={c.trabajador_nombre} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.trabajador_nombre}</p>
                        <p className="truncate font-mono text-xs text-bone-500">{formatearRut(c.trabajador_rut)} · {cargoLabel(c.cargo)}</p>
                        <p className="mt-1 text-xs text-bone-500">Término {fecha(c.fecha_termino)}</p>
                      </div>
                      <span className="btn-primary shrink-0 px-3 py-2 text-sm">Evaluar <ArrowUpRight className="h-4 w-4" /></span>
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>
            </section>
          ))}
        </div>
      )}

      {evaluaciones.length > 0 && (
        <>
          <div className="mb-3 mt-10 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-bone-400">Tus últimas evaluaciones</h2>
            <Link to="/mis-evaluaciones" className="text-sm font-semibold text-obra-300 hover:underline">Ver todas</Link>
          </div>
          <ul className="slab divide-y divide-white/[.05] overflow-hidden">
            {evaluaciones.slice(0, 4).map((e) => (
              <li key={e.id} className="flex items-center gap-4 px-4 py-3">
                <span className="h-9 w-1.5 rounded-full" style={{ background: colorNota(nota(e)) }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.trabajador_nombre}</p>
                  <p className="truncate text-xs text-bone-500">{e.obra_nombre} · {fecha(e.created_date)}</p>
                </div>
                <span className="font-mono text-lg font-bold tabular-nums">{nota(e).toFixed(1).replace('.', ',')}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
