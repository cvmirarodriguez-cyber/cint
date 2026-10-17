import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, Building2, Star, Users, TrendingDown, Award } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { cargoLabel, fecha, nota, resumen } from '@/lib/dominio';
import { Anillo, Avatar, Chip, Contador, Encabezado, Vacio, colorNota, ease, item, lista } from '@/components/ui';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function Kpi({ icono: Icono, etiqueta, valor, tono, delay, decimales = 0, sufijo = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay }}>
      <div className="slab h-full rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">{etiqueta}</p>
          <Icono className={`h-4 w-4 ${tono}`} />
        </div>
        <p className="display mt-3 text-4xl sm:text-5xl">
          <Contador valor={valor} decimales={decimales} />{sufijo}
        </p>
      </div>
    </motion.div>
  );
}

function Select({ value, onChange, children, label }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field min-w-[150px] cursor-pointer">
        {children}
      </select>
    </label>
  );
}

export default function Reportes() {
  const { evaluaciones, contratos, obras, evalsPor } = useDatos();
  const [mes, setMes] = useState('todos');
  const [obraId, setObraId] = useState('todas');

  // Meses disponibles a partir de las evaluaciones (últimos 12).
  const mesesOpts = useMemo(() => {
    const set = new Set();
    evaluaciones.forEach((e) => { if (e.created_date) set.add(e.created_date.slice(0, 7)); });
    const arr = [...set].sort().reverse().slice(0, 12);
    return arr.map((m) => {
      const [y, mo] = m.split('-');
      return { value: m, label: `${MESES[+mo - 1].charAt(0).toUpperCase()}${MESES[+mo - 1].slice(1)} ${y}` };
    });
  }, [evaluaciones]);

  // Evaluaciones filtradas por mes y obra.
  const filtradas = useMemo(() => {
    return evaluaciones.filter((e) => {
      if (mes !== 'todos' && (!e.created_date || e.created_date.slice(0, 7) !== mes)) return false;
      if (obraId !== 'todas' && e.obra_id !== obraId) return false;
      return true;
    });
  }, [evaluaciones, mes, obraId]);

  // KPIs del período filtrado.
  const kpis = useMemo(() => {
    const n = filtradas.length;
    const avg = (k) => n ? filtradas.reduce((s, e) => s + (e[k] || 0), 0) / n : 0;
    const alertas = filtradas.filter((e) => e.alcohol_drogas && e.alcohol_drogas !== 'sin_observaciones').length;
    const bajos = filtradas.filter((e) => nota(e) < 3).length;
    return { n, promedio: (avg('desempeno') + avg('responsabilidad')) / 2, alertas, bajos };
  }, [filtradas]);

  // Evaluaciones por mes (para el gráfico, todo el histórico).
  const porMes = useMemo(() => {
    const map = new Map();
    evaluaciones.forEach((e) => {
      if (!e.created_date) return;
      const m = e.created_date.slice(0, 7);
      if (!map.has(m)) map.set(m, { mes: m, n: 0, suma: 0 });
      const r = map.get(m);
      r.n += 1;
      r.suma += nota(e);
    });
    return [...map.values()].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12).map((r) => ({
      ...r,
      label: (() => { const [y, mo] = r.mes.split('-'); return `${MESES[+mo - 1].charAt(0).toUpperCase()}${MESES[+mo - 1].slice(1)}`; })(),
      prom: r.n ? +(r.suma / r.n).toFixed(1) : 0,
    }));
  }, [evaluaciones]);

  // Peores calificados (según historial agrupado por trabajador), filtrado por obra.
  const peores = useMemo(() => {
    const porTrab = new Map();
    filtradas.forEach((e) => {
      if (!porTrab.has(e.trabajador_id)) porTrab.set(e.trabajador_id, { id: e.trabajador_id, nombre: e.trabajador_nombre, cargo: e.cargo, obra: e.obra_nombre, evals: [] });
      porTrab.get(e.trabajador_id).evals.push(e);
    });
    return [...porTrab.values()]
      .map((t) => ({ ...t, r: resumen(t.evals) }))
      .filter((t) => t.r.n)
      .sort((a, b) => a.r.promedio - b.r.promedio)
      .slice(0, 10);
  }, [filtradas]);

  // Headcount por proyecto (contratos vigentes/pendientes, distinct trabajador).
  const headcount = useMemo(() => {
    const base = obraId === 'todas' ? contratos : contratos.filter((c) => c.obra_id === obraId);
    const map = new Map();
    base.forEach((c) => {
      if (c.estado === 'evaluado') return;
      if (!map.has(c.obra_id)) map.set(c.obra_id, { obra_id: c.obra_id, nombre: c.obra_nombre || 'Sin nombre', trabajadores: new Set(), vigentes: 0, pendientes: 0 });
      const r = map.get(c.obra_id);
      r.trabajadores.add(c.trabajador_id);
      if (c.estado === 'vigente') r.vigentes += 1;
      if (c.estado === 'pendiente') r.pendientes += 1;
    });
    return [...map.values()]
      .map((r) => ({ ...r, headcount: r.trabajadores.size }))
      .sort((a, b) => b.headcount - a.headcount);
  }, [contratos, obraId]);

  const maxHead = Math.max(1, ...headcount.map((h) => h.headcount));

  return (
    <div>
      <Encabezado eyebrow="Reportes" titulo="Reportes de gestión">
        Evaluaciones, desempeño y dotación por mes y por obra. Filtra el período y el proyecto para analizar tendencias.
      </Encabezado>

      {/* Filtros */}
      <div className="slab mb-6 flex flex-wrap items-end gap-4 p-4 sm:p-5">
        <Select label="Mes" value={mes} onChange={setMes}>
          <option value="todos">Todos los meses</option>
          {mesesOpts.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
        <Select label="Obra" value={obraId} onChange={setObraId}>
          <option value="todas">Todas las obras</option>
          {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </Select>
        {(mes !== 'todos' || obraId !== 'todas') && (
          <button onClick={() => { setMes('todos'); setObraId('todas'); }} className="btn-ghost ml-auto">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icono={Star} etiqueta="Evaluaciones" valor={kpis.n} tono="text-ok" delay={0.05} />
        <Kpi icono={Award} etiqueta="Promedio general" valor={kpis.promedio} tono="text-obra" delay={0.1} decimales={1} />
        <Kpi icono={TrendingDown} etiqueta="Bajo desempeño" valor={kpis.bajos} tono="text-hivis" delay={0.15} />
        <Kpi icono={AlertTriangle} etiqueta="Alertas A/D" valor={kpis.alertas} tono="text-alerta" delay={0.2} />
      </div>

      {/* Gráfico: evaluaciones por mes */}
      <section className="slab mb-8 p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">
          <CalendarDays className="h-4 w-4" /> Evaluaciones por mes
        </h2>
        <p className="mb-4 text-xs text-bone-500">Cantidad de evaluaciones registradas y promedio de nota (1–5).</p>
        {porMes.length ? (
          <div className="flex h-56 items-end gap-2 sm:gap-3">
            {porMes.map((d) => {
              const maxN = Math.max(1, ...porMes.map((p) => p.n));
              const activo = mes === d.mes;
              const atenuado = mes !== 'todos' && !activo;
              return (
                <div key={d.mes} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end justify-center">
                    <div
                      className="w-full max-w-[44px] rounded-t-md transition-all duration-300"
                      style={{
                        height: `${(d.n / maxN) * 100}%`,
                        background: activo ? '#FF5F1F' : '#FF8A55',
                        opacity: atenuado ? 0.4 : 1,
                        boxShadow: activo ? '0 0 16px rgba(255,95,31,.5)' : 'none',
                      }}
                      title={`${d.n} evaluaciones · promedio ${d.prom}`}
                    />
                    <span className="absolute -top-5 font-mono text-xs font-bold text-bone-200">{d.n}</span>
                  </div>
                  <span className={`text-[11px] ${activo ? 'text-obra font-bold' : 'text-bone-500'}`}>{d.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-bone-500">Sin evaluaciones registradas todavía.</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Peores calificados */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-alerta">
            <TrendingDown className="h-4 w-4" /> Peores calificados del período
          </h2>
          {peores.length ? (
            <motion.ul variants={lista} initial="hidden" animate="show" className="slab overflow-hidden">
              <div className="hazard-red h-1.5" />
              {peores.map((t, i) => (
                <motion.li key={t.id} variants={item}>
                  <Link to={`/trabajadores/${t.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[.03]">
                    <span className="w-5 font-mono text-sm text-bone-600">{String(i + 1).padStart(2, '0')}</span>
                    <Avatar nombre={t.nombre} size={36} alerta={t.r.alerta} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.nombre}</p>
                      <p className="truncate text-xs text-bone-500">{cargoLabel(t.cargo)} · {t.obra || 'Sin obra'} · {t.r.n} {t.r.n === 1 ? 'eval.' : 'evals.'}</p>
                    </div>
                    {t.r.alerta && <Chip tono="bad">A/D</Chip>}
                    <Anillo valor={t.r.promedio} size={40} grosor={4} />
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          ) : (
            <Vacio icono={TrendingDown} titulo="Sin datos en este filtro">No hay evaluaciones para el mes y obra seleccionados.</Vacio>
          )}
        </section>

        {/* Headcount por proyecto */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">
            <Building2 className="h-4 w-4" /> Dotación por proyecto
          </h2>
          {headcount.length ? (
            <div className="slab divide-y divide-white/[.05] overflow-hidden">
              {headcount.map((h) => (
                <div key={h.obra_id} className="px-4 py-3.5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold">{h.nombre}</p>
                    <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-bone">{h.headcount}</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-white/[.05]">
                    <div className="h-full bg-obra" style={{ width: `${(h.vigentes / maxHead) * 100}%` }} title={`${h.vigentes} vigentes`} />
                    <div className="h-full bg-hivis" style={{ width: `${(h.pendientes / maxHead) * 100}%` }} title={`${h.pendientes} pendientes`} />
                  </div>
                  <div className="mt-1.5 flex gap-3 text-xs text-bone-500">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-obra" /> {h.vigentes} vigentes</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-hivis" /> {h.pendientes} pendientes</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Vacio icono={Users} titulo="Sin dotación">No hay contratos vigentes o pendientes para mostrar.</Vacio>
          )}
        </section>
      </div>
    </div>
  );
}