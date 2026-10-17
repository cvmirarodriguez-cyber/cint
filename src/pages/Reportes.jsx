import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarDays, Building2, Star, Users, TrendingDown, Award, FileSpreadsheet, FileText, PieChart as PieIcon } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useDatos } from '@/lib/datos';
import { cargoLabel, nota, resumen } from '@/lib/dominio';
import { Anillo, Avatar, Chip, Contador, Encabezado, Vacio, colorNota, ease, item, lista } from '@/components/ui';
import { exportarExcel, exportarPDF } from '@/lib/exportarReportes';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const OBRA = '#FF5F1F';
const HIVIS = '#FFC21A';
const OK = '#5BD68F';
const ALERTA = '#FF4141';

// Sigue el tema claro/oscuro para pintar ejes y grilla.
function useTemaClaro() {
  const [claro, setClaro] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('light'));
  useEffect(() => {
    const obs = new MutationObserver(() => setClaro(document.documentElement.classList.contains('light')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return claro;
}

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
  const claro = useTemaClaro();

  const axis = claro ? '#6b6b6b' : '#8a8882';
  const grid = claro ? '#00000014' : '#ffffff12';
  const tooltipStyle = {
    background: claro ? '#fff' : '#181417',
    border: `1px solid ${claro ? '#ddd' : '#ffffff20'}`,
    borderRadius: 12,
    fontSize: 12,
    color: claro ? '#1a1a1a' : '#ECE9E2',
  };

  const mesesOpts = useMemo(() => {
    const set = new Set();
    evaluaciones.forEach((e) => { if (e.created_date) set.add(e.created_date.slice(0, 7)); });
    return [...set].sort().reverse().slice(0, 12).map((m) => {
      const [y, mo] = m.split('-');
      return { value: m, label: `${MESES[+mo - 1].charAt(0).toUpperCase()}${MESES[+mo - 1].slice(1)} ${y}` };
    });
  }, [evaluaciones]);

  const filtradas = useMemo(() => evaluaciones.filter((e) => {
    if (mes !== 'todos' && (!e.created_date || e.created_date.slice(0, 7) !== mes)) return false;
    if (obraId !== 'todas' && e.obra_id !== obraId) return false;
    return true;
  }), [evaluaciones, mes, obraId]);

  const kpis = useMemo(() => {
    const n = filtradas.length;
    const avg = (k) => n ? filtradas.reduce((s, e) => s + (e[k] || 0), 0) / n : 0;
    return {
      n,
      promedio: (avg('desempeno') + avg('responsabilidad')) / 2,
      alertas: filtradas.filter((e) => e.alcohol_drogas && e.alcohol_drogas !== 'sin_observaciones').length,
      bajos: filtradas.filter((e) => nota(e) < 3).length,
    };
  }, [filtradas]);

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
    return [...map.values()].sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12).map((r) => {
      const [y, mo] = r.mes.split('-');
      return { ...r, label: `${MESES[+mo - 1].charAt(0).toUpperCase()}${MESES[+mo - 1].slice(1)} ${y.slice(2)}`, prom: r.n ? +(r.suma / r.n).toFixed(1) : 0 };
    });
  }, [evaluaciones]);

  // Distribución de recontratación del período filtrado.
  const recontratar = useMemo(() => {
    const c = { si: 0, con_reservas: 0, no: 0 };
    filtradas.forEach((e) => { if (e.recontratar && c[e.recontratar] != null) c[e.recontratar] += 1; });
    return [
      { name: 'Sí', value: c.si, color: OK },
      { name: 'Con reservas', value: c.con_reservas, color: HIVIS },
      { name: 'No', value: c.no, color: ALERTA },
    ].filter((d) => d.value > 0);
  }, [filtradas]);

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
      .map((r) => ({ nombre: r.nombre, headcount: r.trabajadores.size, vigentes: r.vigentes, pendientes: r.pendientes }))
      .sort((a, b) => b.headcount - a.headcount);
  }, [contratos, obraId]);

  const mesLabel = mes === 'todos' ? 'Todos los meses' : (mesesOpts.find((m) => m.value === mes)?.label || mes);
  const obraLabel = obraId === 'todas' ? 'Todas las obras' : (obras.find((o) => o.id === obraId)?.nombre || obraId);
  const hayDatos = filtradas.length > 0 || porMes.length > 0 || headcount.length > 0;

  const exportar = (fn) => fn({ kpis, filtradas, porMes, peores, headcount, mesLabel, obraLabel });

  return (
    <div>
      <Encabezado eyebrow="Reportes" titulo="Reportes de gestión"
        accion={
          <div className="flex gap-2">
            <button onClick={() => exportar(exportarExcel)} disabled={!hayDatos} className="btn-primary">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button onClick={() => exportar(exportarPDF)} disabled={!hayDatos} className="btn-ghost">
              <FileText className="h-4 w-4" /> PDF
            </button>
          </div>
        }
      >
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
          <button onClick={() => { setMes('todos'); setObraId('todas'); }} className="btn-ghost ml-auto">Limpiar filtros</button>
        )}
      </div>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi icono={Star} etiqueta="Evaluaciones" valor={kpis.n} tono="text-ok" delay={0.05} />
        <Kpi icono={Award} etiqueta="Promedio general" valor={kpis.promedio} tono="text-obra" delay={0.1} decimales={1} />
        <Kpi icono={TrendingDown} etiqueta="Bajo desempeño" valor={kpis.bajos} tono="text-hivis" delay={0.15} />
        <Kpi icono={AlertTriangle} etiqueta="Alertas A/D" valor={kpis.alertas} tono="text-alerta" delay={0.2} />
      </div>

      {/* Gráfico: evaluaciones por mes (barras + línea de promedio) */}
      <section className="slab mb-8 p-5 sm:p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">
          <CalendarDays className="h-4 w-4" /> Evaluaciones por mes
        </h2>
        <p className="mb-4 text-xs text-bone-500">Cantidad de evaluaciones (barras) y promedio de nota 1–5 (línea).</p>
        {porMes.length ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={porMes} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: axis, fontSize: 11 }} stroke={grid} />
                <YAxis yAxisId="n" tick={{ fill: axis, fontSize: 11 }} stroke={grid} allowDecimals={false} />
                <YAxis yAxisId="prom" orientation="right" domain={[0, 5]} tick={{ fill: axis, fontSize: 11 }} stroke={grid} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: 700 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar yAxisId="n" dataKey="n" name="Evaluaciones" fill={OBRA} radius={[6, 6, 0, 0]} maxBarSize={46} />
                <Line yAxisId="prom" type="monotone" dataKey="prom" name="Promedio" stroke={HIVIS} strokeWidth={3} dot={{ r: 4, fill: HIVIS }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-bone-500">Sin evaluaciones registradas todavía.</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribución de recontratación */}
        <section className="slab p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">
            <PieIcon className="h-4 w-4" /> Recontratación
          </h2>
          <p className="mb-4 text-xs text-bone-500">Veredicto de recontratar del período filtrado.</p>
          {recontratar.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={recontratar} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {recontratar.map((d) => <Cell key={d.name} fill={d.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-bone-500">Sin evaluaciones en este filtro.</p>
          )}
        </section>

        {/* Dotación por proyecto (barras horizontales apiladas) */}
        <section className="slab p-5 sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">
            <Building2 className="h-4 w-4" /> Dotación por proyecto
          </h2>
          <p className="mb-4 text-xs text-bone-500">Trabajadores vigentes y pendientes de evaluación por obra.</p>
          {headcount.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={headcount} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: axis, fontSize: 11 }} stroke={grid} allowDecimals={false} />
                  <YAxis type="category" dataKey="nombre" tick={{ fill: axis, fontSize: 11 }} stroke={grid} width={90} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: claro ? '#00000008' : '#ffffff08' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="vigentes" name="Vigentes" stackId="a" fill={OBRA} maxBarSize={26} />
                  <Bar dataKey="pendientes" name="Pendientes" stackId="a" fill={HIVIS} radius={[0, 6, 6, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-bone-500">Sin contratos vigentes o pendientes.</p>
          )}
        </section>
      </div>

      {/* Peores calificados */}
      <section className="mt-6">
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
    </div>
  );
}