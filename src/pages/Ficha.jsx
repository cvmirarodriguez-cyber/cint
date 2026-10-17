import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertOctagon, ArrowLeft, Building2, ClipboardCheck, FileText, Loader2, MessageSquareQuote, Paperclip, Phone } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { AD, NOTAS, RECONTRATAR, VEREDICTO, cargoLabel, fecha, nota, resumen } from '@/lib/dominio';
import { formatearRut } from '@/lib/rut';
import { Anillo, Avatar, Chip, Tilt, Vacio, colorNota, ease, useToast } from '@/components/ui';
import { TIPOS_CV, abrirDocumento, nuevoDocumento, subirPrivado } from '@/lib/documentos';

function Barra({ etiqueta, valor }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-bone-500">{etiqueta}</span>
        <span className="font-mono font-bold">{valor ? valor.toFixed(1).replace('.', ',') : '—'}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[.06]">
        <motion.div className="h-full rounded-full" style={{ background: colorNota(valor) }} initial={{ width: 0 }} animate={{ width: `${valor ? (valor / 5) * 100 : 0}%` }} transition={{ duration: 0.9, ease, delay: 0.2 }} />
      </div>
    </div>
  );
}

// Currículums y documentos del trabajador: privados, se abren con un enlace temporal.
function Documentos({ t }) {
  const { E, usuario, recargar } = useDatos();
  const avisar = useToast();
  const [subiendo, setSubiendo] = useState(false);
  const input = useRef(null);
  const docs = [...(t.documentos || [])].reverse();

  const adjuntar = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setSubiendo(true);
    try {
      const uri = await subirPrivado(f);
      await E.Trabajador.update(t.id, { documentos: [...(t.documentos || []), nuevoDocumento(f.name, uri, /cv|curr/i.test(f.name) ? 'cv' : 'otro', usuario)] });
      await recargar();
      avisar('Documento adjuntado');
    } catch {
      avisar('No se pudo subir el documento', 'bad');
    } finally {
      setSubiendo(false);
    }
  };

  const ver = async (d) => {
    try { await abrirDocumento(d.uri); } catch { avisar('No se pudo abrir el documento', 'bad'); }
  };

  return (
    <div className="slab mt-4 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-wider text-bone-400">Documentos</p>
        <button onClick={() => input.current?.click()} disabled={subiendo} className="btn-ghost px-3 py-1.5 text-xs">
          {subiendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />} Adjuntar
        </button>
        <input ref={input} type="file" accept={TIPOS_CV} className="hidden" onChange={adjuntar} />
      </div>
      {t.experiencia && <p className="mb-3 border-l-2 border-obra/50 pl-3 text-sm text-bone-300">{t.experiencia}</p>}
      {docs.length ? (
        <ul className="space-y-1.5">
          {docs.map((d, i) => (
            <li key={`${d.uri}-${i}`}>
              <button onClick={() => ver(d)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[.04]">
                <FileText className={`h-4 w-4 shrink-0 ${d.tipo === 'cv' ? 'text-obra' : 'text-bone-500'}`} />
                <span className="min-w-0 flex-1 truncate text-sm">{d.nombre}</span>
                <span className="shrink-0 text-xs text-bone-600">{d.tipo === 'cv' ? 'CV · ' : ''}{fecha(d.fecha)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-bone-500">Sin currículum ni documentos.</p>
      )}
    </div>
  );
}

export default function Ficha() {
  const { id } = useParams();
  const { trabajadores, evalsPor, contratos, cargando } = useDatos();
  const t = trabajadores.find((x) => x.id === id);
  if (cargando) return null;
  if (!t) return <Vacio titulo="Trabajador no encontrado"><Link to="/trabajadores" className="text-obra-300 underline">Volver</Link></Vacio>;

  const evals = [...(evalsPor.get(t.id) || [])].sort((a, b) => (b.fecha_termino || b.created_date).localeCompare(a.fecha_termino || a.created_date));
  const r = resumen(evals);
  const v = VEREDICTO[r.veredicto];
  const vigentes = contratos.filter((c) => c.trabajador_id === t.id && c.estado !== 'evaluado');
  const obras = new Set(evals.map((e) => e.obra_id || e.obra_nombre)).size;

  return (
    <div>
      <Link to="/trabajadores" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-bone-500 transition-colors hover:text-bone">
        <ArrowLeft className="h-4 w-4" /> Personal
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* Credencial 3D */}
        <div className="lg:sticky lg:top-10 lg:self-start">
          <Tilt className="slab overflow-hidden rounded-3xl" max={10}>
            <div className={`${r.veredicto === 'no_recomendado' ? 'hazard-red' : 'hazard'} h-3`} />
            <div className="blueprint p-6">
              <div className="flex items-start justify-between" style={{ transform: 'translateZ(30px)' }}>
                <Avatar nombre={t.nombre} size={64} alerta={!!r.alerta} />
                <Anillo valor={r.promedio} size={92} grosor={8} />
              </div>
              <div className="mt-6" style={{ transform: 'translateZ(20px)' }}>
                <p className="eyebrow">{cargoLabel(t.cargo)}{t.especialidad ? ` · ${t.especialidad}` : ''}</p>
                <h1 className="display mt-2 text-3xl">{t.nombre}</h1>
                <p className="mt-2 font-mono text-bone-400">{formatearRut(t.rut)}</p>
                {t.telefono && <a href={`tel:${t.telefono}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-bone-400 hover:text-bone"><Phone className="h-3.5 w-3.5" />{t.telefono}</a>}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Chip tono={v.tono} className="px-3 py-1.5 text-sm">{v.label}</Chip>
                {r.alerta && <Chip tono="bad" className="px-3 py-1.5 text-sm"><AlertOctagon className="h-3.5 w-3.5" />{r.confirmados ? `${r.confirmados} incidente A/D` : 'Reporte A/D'}</Chip>}
              </div>
              <div className="mt-6 space-y-3">
                <Barra etiqueta="Desempeño" valor={r.desempeno} />
                <Barra etiqueta="Responsabilidad" valor={r.responsabilidad} />
              </div>
              <div className="mt-6 grid grid-cols-3 divide-x divide-white/[.06] rounded-xl border border-white/[.06] bg-ink/40 text-center">
                {[[r.n, 'Evaluaciones'], [obras, 'Obras'], [r.noRecontratar || 0, 'No recontratar']].map(([n, l]) => (
                  <div key={l} className="py-3">
                    <p className="display text-2xl">{n}</p>
                    <p className="text-[11px] text-bone-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </Tilt>
          <Link to={`/evaluar?trabajador=${t.id}`} className="btn-primary mt-4 w-full"><ClipboardCheck className="h-4 w-4" /> Evaluar a {t.nombre.split(' ')[0]}</Link>
          <Documentos t={t} />
        </div>

        {/* Historial */}
        <section>
          {vigentes.length > 0 && (
            <div className="mb-6 space-y-2">
              {vigentes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-obra/30 bg-obra/[.06] px-4 py-3 text-sm">
                  <Building2 className="h-4 w-4 text-obra" />
                  <span className="flex-1">{c.estado === 'pendiente' ? 'Pendiente de evaluar en' : 'Actualmente en'} <b>{c.obra_nombre}</b></span>
                  {c.estado === 'pendiente' && <Link to={`/evaluar?contrato=${c.id}`} className="font-semibold text-obra-300 underline">Evaluar</Link>}
                </div>
              ))}
            </div>
          )}

          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-bone-400">Historial por obra</h2>
          {!evals.length ? (
            <Vacio icono={ClipboardCheck} titulo="Sin evaluaciones todavía">La primera evaluación quedará al término de su próximo contrato.</Vacio>
          ) : (
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-gradient-to-b before:from-obra/60 before:via-white/10 before:to-transparent">
              {evals.map((e, i) => {
                const n = nota(e);
                const ad = AD[e.alcohol_drogas] ?? AD.sin_observaciones;
                const rc = RECONTRATAR[e.recontratar] ?? RECONTRATAR.si;
                return (
                  <motion.li key={e.id} className="relative pl-10" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease, delay: 0.1 + i * 0.06 }}>
                    <span className="absolute left-0 top-5 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-ink-600" style={{ boxShadow: `0 0 0 2px ${colorNota(n)}` }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: colorNota(n) }} />
                    </span>
                    <article className="slab p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{e.obra_nombre || 'Obra sin nombre'}</p>
                          <p className="text-xs text-bone-500">{cargoLabel(e.cargo)} · término {fecha(e.fecha_termino)} · por {e.evaluador_nombre || e.created_by}</p>
                        </div>
                        <span className="display text-3xl" style={{ color: colorNota(n) }}>{n.toFixed(1).replace('.', ',')}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-white/[.03] px-3 py-2"><p className="text-xs text-bone-500">Desempeño</p><p className="font-semibold">{e.desempeno} · {NOTAS[e.desempeno]}</p></div>
                        <div className="rounded-xl bg-white/[.03] px-3 py-2"><p className="text-xs text-bone-500">Responsabilidad</p><p className="font-semibold">{e.responsabilidad} · {NOTAS[e.responsabilidad]}</p></div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Chip tono={ad.tono}>Alcohol/drogas: {ad.label}</Chip>
                        <Chip tono={rc.tono}>Recontratar: {rc.label}</Chip>
                      </div>
                      {e.comentario && (
                        <p className="mt-4 flex gap-2 border-l-2 border-obra/50 pl-3 text-sm italic text-bone-200">
                          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-bone-600" />{e.comentario}
                        </p>
                      )}
                    </article>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
