import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ClipboardCheck, Users, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { fecha, nota } from '@/lib/dominio';
import { Avatar, Contador, Tilt, Vacio, colorNota, ease, item, lista } from '@/components/ui';

// Resumen por proyecto para el jefe de terreno: progreso de evaluaciones y personal activo.
export default function MisObras() {
  const { cargando, obras, contratos, evaluaciones, pendientes } = useDatos();

  const proyectos = useMemo(() => {
    const porObra = new Map();
    const asegurar = (obraId) => {
      if (!porObra.has(obraId)) {
        porObra.set(obraId, { obraId, vigentes: [], pendientes: [], evaluados: [], evaluaciones: [] });
      }
      return porObra.get(obraId);
    };
    for (const c of contratos) {
      if (!c.obra_id) continue;
      const g = asegurar(c.obra_id);
      if (c.estado === 'vigente') g.vigentes.push(c);
      else if (c.estado === 'pendiente') g.pendientes.push(c);
      else if (c.estado === 'evaluado') g.evaluados.push(c);
    }
    for (const e of evaluaciones) {
      if (!e.obra_id) continue;
      if (porObra.has(e.obra_id)) porObra.get(e.obra_id).evaluaciones.push(e);
    }
    return obras
      .map((o) => {
        const g = porObra.get(o.id) || { vigentes: [], pendientes: [], evaluados: [], evaluaciones: [] };
        const cerrados = g.evaluados.length + g.pendientes.length;
        const progreso = cerrados ? Math.round((g.evaluados.length / cerrados) * 100) : 0;
        const notas = g.evaluaciones.map((e) => nota(e)).filter((n) => !Number.isNaN(n));
        const promedio = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;
        return {
          ...o,
          vigentes: g.vigentes,
          pendientes: g.pendientes,
          evaluados: g.evaluados,
          evaluaciones: g.evaluaciones,
          progreso,
          promedio,
        };
      })
      .sort((a, b) => (b.vigentes.length + b.pendientes.length) - (a.vigentes.length + a.pendientes.length));
  }, [obras, contratos, evaluaciones]);

  const totales = useMemo(() => {
    const vigentes = proyectos.reduce((s, p) => s + p.vigentes.length, 0);
    const pendientesTot = proyectos.reduce((s, p) => s + p.pendientes.length, 0);
    const evaluados = proyectos.reduce((s, p) => s + p.evaluados.length, 0);
    const cerrados = evaluados + pendientesTot;
    const progresoGlobal = cerrados ? Math.round((evaluados / cerrados) * 100) : 0;
    return { vigentes, pendientes: pendientesTot, evaluados, progreso: progresoGlobal };
  }, [proyectos]);

  if (!cargando && !proyectos.length) {
    return (
      <div>
        <h1 className="display mb-6 text-3xl sm:text-4xl">Mis obras</h1>
        <Vacio icono={Building2} titulo="Sin obras asignadas">
          Aún no tienes obras a cargo. Cuando el jefe de personal te asigne una obra, verás aquí sus métricas.
        </Vacio>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-col gap-2 sm:mb-8">
        <p className="eyebrow">Resumen de proyectos</p>
        <h1 className="display text-3xl sm:text-4xl lg:text-5xl">Mis obras</h1>
        <p className="mt-2 max-w-xl text-bone-400">Métricas clave de cada proyecto: personal activo y progreso de evaluaciones.</p>
      </header>

      {/* KPIs globales */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { n: totales.vigentes, label: 'Personal activo', icono: Users, tono: 'text-bone' },
          { n: totales.pendientes, label: 'Por evaluar', icono: AlertCircle, tono: 'text-obra' },
          { n: totales.evaluados, label: 'Evaluados', icono: CheckCircle2, tono: 'text-ok' },
          { n: totales.progreso, label: 'Progreso %', icono: ClipboardCheck, tono: 'text-hivis', sufijo: '%' },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.05 + i * 0.05 }}>
            <Tilt className="slab rounded-2xl p-4 sm:p-5" max={6}>
              <div className="flex items-center justify-between">
                <p className="eyebrow">{k.label}</p>
                <k.icono className="h-4 w-4 text-bone-600" />
              </div>
              <p className={`display mt-3 text-3xl sm:text-4xl ${k.tono}`}>
                <Contador valor={k.n} />{k.sufijo || ''}
              </p>
            </Tilt>
          </motion.div>
        ))}
      </div>

      {/* Tarjetas por obra */}
      <motion.div variants={lista} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {proyectos.map((p) => (
          <motion.article key={p.id} variants={item}>
            <div className="slab slab-hover flex flex-col rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-obra" />
                    <h2 className="truncate text-lg font-bold">{p.nombre}</h2>
                  </div>
                  <p className="mt-1 text-xs text-bone-500">
                    {p.ubicacion || 'Sin ubicación'}
                    {p.fecha_termino ? ` · término ${fecha(p.fecha_termino)}` : ''}
                  </p>
                </div>
                <span className={`chip shrink-0 ${p.estado === 'en_curso' ? 'border-obra/40 bg-obra/10 text-obra-300' : 'border-white/10 bg-white/[.04] text-bone-400'}`}>
                  {p.estado === 'en_curso' ? 'En curso' : 'Terminada'}
                </span>
              </div>

              {/* Métricas */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <Metrica label="Activos" valor={p.vigentes.length} tono="text-bone" />
                <Metrica label="Por evaluar" valor={p.pendientes.length} tono="text-obra" />
                <Metrica label="Evaluados" valor={p.evaluados.length} tono="text-ok" />
              </div>

              {/* Barra de progreso */}
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-bone-500">Progreso de evaluaciones</span>
                  <span className="font-mono font-bold text-bone-200">{p.progreso}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: p.progreso === 100 ? '#5BD68F' : 'linear-gradient(90deg,#FF5F1F,#FF8A55)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.progreso}%` }}
                    transition={{ duration: 0.9, ease }}
                  />
                </div>
              </div>

              {/* Promedio y acciones */}
              <div className="mt-5 flex items-center justify-between border-t border-white/[.06] pt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-bone-500">Promedio</span>
                  {p.promedio != null ? (
                    <span className="flex items-center gap-1.5 font-mono font-bold" style={{ color: colorNota(p.promedio) }}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorNota(p.promedio) }} />
                      {p.promedio.toFixed(1).replace('.', ',')}
                    </span>
                  ) : (
                    <span className="text-bone-600">—</span>
                  )}
                </div>
                {p.pendientes.length > 0 ? (
                  <Link to={`/evaluar?obra=${encodeURIComponent(p.id)}`} className="btn-primary px-3 py-2 text-sm">
                    Evaluar <ArrowUpRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="chip border-ok/30 bg-ok/10 text-ok"><CheckCircle2 className="h-3.5 w-3.5" /> Al día</span>
                )}
              </div>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}

function Metrica({ label, valor, tono }) {
  return (
    <div className="rounded-xl bg-white/[.03] px-3 py-2.5 text-center ring-1 ring-white/[.04]">
      <p className="font-mono text-2xl font-bold tabular-nums">{valor}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-bone-500">{label}</p>
    </div>
  );
}