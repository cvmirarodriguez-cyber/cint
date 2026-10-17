import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpRight, ClipboardCheck, HardHat, Star, Upload, Clock } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { cargoLabel, fecha, nota, resumen } from '@/lib/dominio';
import { Anillo, Avatar, Chip, Contador, Tilt, Vacio, colorNota, ease, item, lista } from '@/components/ui';

const Obra3D = lazy(() => import('@/components/Obra3D'));
import ErrorBoundary3D from '@/components/ErrorBoundary3D';

function Kpi({ icono: Icono, etiqueta, valor, tono, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay }}>
      <Tilt className="slab h-full rounded-2xl p-4 sm:p-5" max={6}>
        <div className="flex items-center justify-between">
          <p className="eyebrow">{etiqueta}</p>
          <Icono className={`h-4 w-4 ${tono}`} />
        </div>
        <p className="display mt-3 text-4xl sm:text-5xl"><Contador valor={valor} /></p>
      </Tilt>
    </motion.div>
  );
}

export default function Panel() {
  const { usuario, cargando, trabajadores, evaluaciones, pendientes, evalsPor, esAdmin } = useDatos();

  const { alertas, destacados } = useMemo(() => {
    const filas = trabajadores.map((t) => ({ t, r: resumen(evalsPor.get(t.id)) })).filter((x) => x.r.n);
    return {
      alertas: filas.filter((x) => x.r.alerta || x.r.veredicto === 'no_recomendado').slice(0, 5),
      destacados: filas.filter((x) => x.r.veredicto === 'recomendado').sort((a, b) => b.r.promedio - a.r.promedio).slice(0, 5),
    };
  }, [trabajadores, evalsPor]);

  const nAlertas = useMemo(() => new Set(evaluaciones.filter((e) => e.alcohol_drogas !== 'sin_observaciones' && e.alcohol_drogas).map((e) => e.trabajador_id)).size, [evaluaciones]);
  const nombre = (usuario.full_name || '').split(' ')[0];

  return (
    <div>
      {/* Hero con la obra 3D */}
      <section className="slab blueprint relative mb-6 min-h-[340px] overflow-hidden rounded-3xl">
        <ErrorBoundary3D>
          <Suspense fallback={null}>
            <Obra3D className="absolute inset-x-0 bottom-0 h-[230px] sm:inset-y-0 sm:left-auto sm:right-[-6%] sm:h-auto sm:w-[62%]" camara={[12.5, 6, 14.5]} />
          </Suspense>
        </ErrorBoundary3D>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-700 from-40% via-ink-700/50 via-60% to-transparent sm:bg-gradient-to-r sm:from-25% sm:via-45% sm:via-ink-700/60 sm:to-70%" />
        <div className="relative z-10 max-w-lg p-6 pb-[210px] sm:p-10">
          <p className="eyebrow mb-3">{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="display break-words text-4xl sm:text-5xl">Hola{nombre ? `, ${nombre}` : ''}.</h1>
          <p className="mt-4 text-bone-400">
            {pendientes.length
              ? <>Tienes <b className="text-obra-300">{pendientes.length} {pendientes.length === 1 ? 'término de contrato' : 'términos de contrato'}</b> esperando evaluación.</>
              : 'No tienes evaluaciones pendientes. La cuadrilla está al día.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/evaluar" className="btn-primary"><ClipboardCheck className="h-4 w-4" /> Evaluar trabajador</Link>
            <Link to="/trabajadores" className="btn-ghost">Buscar por RUT</Link>
          </div>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icono={HardHat} etiqueta="Personal" valor={trabajadores.length} tono="text-bone-400" delay={0.05} />
        <Kpi icono={Star} etiqueta="Evaluaciones" valor={evaluaciones.length} tono="text-ok" delay={0.1} />
        <Kpi icono={Clock} etiqueta="Pendientes" valor={pendientes.length} tono="text-obra" delay={0.15} />
        <Kpi icono={AlertTriangle} etiqueta="Alertas A/D" valor={nAlertas} tono="text-alerta" delay={0.2} />
      </div>

      {!cargando && esAdmin && trabajadores.length === 0 && (
        <div className="slab mb-8 flex flex-col items-start gap-4 overflow-hidden p-6 sm:flex-row sm:items-center">
          <div className="hazard absolute inset-y-0 left-0 w-2" />
          <div className="flex-1 pl-2">
            <p className="text-lg font-bold">Empieza cargando la base actual</p>
            <p className="text-sm text-bone-400">Pega desde Excel o sube un CSV con nombre, RUT y cargo de todo el personal de terreno.</p>
          </div>
          <Link to="/importar" className="btn-primary"><Upload className="h-4 w-4" /> Importar personal</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">
            <span className="h-2 w-2 rounded-full bg-obra shadow-[0_0_10px_#FF5F1F]" /> Pendientes de evaluar
          </h2>
          {pendientes.length ? (
            <motion.ul variants={lista} initial="hidden" animate="show" className="space-y-2">
              {pendientes.slice(0, 6).map((c) => (
                <motion.li key={c.id} variants={item}>
                  <Link to={`/evaluar?contrato=${c.id}`} className="slab slab-hover group flex items-center gap-4 p-4">
                    <Avatar nombre={c.trabajador_nombre} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.trabajador_nombre}</p>
                      <p className="truncate text-sm text-bone-500">{cargoLabel(c.cargo)} · {c.obra_nombre}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="eyebrow">Término</p>
                      <p className="font-mono text-sm">{fecha(c.fecha_termino)}</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-bone-600 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-obra" />
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          ) : (
            <Vacio icono={ClipboardCheck} titulo="Todo al día">Cuando el jefe de personal de obra marque un término de contrato, aparecerá aquí para evaluarlo.</Vacio>
          )}

          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wider text-bone-400">Últimas evaluaciones</h2>
          {evaluaciones.length ? (
            <motion.ul variants={lista} initial="hidden" animate="show" className="slab divide-y divide-white/[.05] overflow-hidden">
              {evaluaciones.slice(0, 6).map((e) => (
                <motion.li key={e.id} variants={item}>
                  <Link to={`/trabajadores/${e.trabajador_id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[.03]">
                    <span className="h-9 w-1.5 rounded-full" style={{ background: colorNota(nota(e)) }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{e.trabajador_nombre}</p>
                      <p className="truncate text-xs text-bone-500">{e.obra_nombre || 'Sin obra'} · por {e.evaluador_nombre || e.created_by}</p>
                    </div>
                    {e.alcohol_drogas && e.alcohol_drogas !== 'sin_observaciones' && <Chip tono="bad">A/D</Chip>}
                    <span className="font-mono text-lg font-bold tabular-nums">{nota(e).toFixed(1).replace('.', ',')}</span>
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          ) : (
            <Vacio titulo="Aún no hay evaluaciones" />
          )}
        </section>

        <aside className="space-y-6 lg:col-span-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-alerta">
              <AlertTriangle className="h-4 w-4" /> Revisar antes de recontratar
            </h2>
            <div className="slab overflow-hidden">
              <div className="hazard-red h-1.5" />
              {alertas.length ? (
                <ul className="divide-y divide-white/[.05]">
                  {alertas.map(({ t, r }) => (
                    <li key={t.id}>
                      <Link to={`/trabajadores/${t.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[.03]">
                        <Avatar nombre={t.nombre} size={36} alerta />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{t.nombre}</p>
                          <p className="text-xs text-bone-500">{r.confirmados ? 'Incidente A/D confirmado' : r.sospechas ? 'Reporte A/D' : 'Bajo desempeño'}</p>
                        </div>
                        <Anillo valor={r.promedio} size={40} grosor={4} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-sm text-bone-500">Sin alertas registradas.</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ok">
              <Star className="h-4 w-4" /> Mejor evaluados
            </h2>
            <div className="slab overflow-hidden">
              {destacados.length ? (
                <ul className="divide-y divide-white/[.05]">
                  {destacados.map(({ t, r }, i) => (
                    <li key={t.id}>
                      <Link to={`/trabajadores/${t.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[.03]">
                        <span className="w-5 font-mono text-sm text-bone-600">{String(i + 1).padStart(2, '0')}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{t.nombre}</p>
                          <p className="text-xs text-bone-500">{cargoLabel(t.cargo)} · {r.n} {r.n === 1 ? 'obra' : 'obras'}</p>
                        </div>
                        <Anillo valor={r.promedio} size={40} grosor={4} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-sm text-bone-500">Aparecerán cuando haya evaluaciones.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}