import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDatos } from '@/lib/datos';
import { Encabezado, ease, useToast } from '@/components/ui';

const AGENTE = 'recomendador';

// Markdown mínimo: títulos, negritas, listas y tablas, suficiente para las respuestas del agente.
const enLinea = (l) => l.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i} className="text-bone">{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
const celdas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function Texto({ texto }) {
  const lineas = String(texto || '').split('\n');
  const bloques = [];
  for (let i = 0; i < lineas.length; i++) {
    const t = lineas[i].trim();
    if (t.startsWith('|')) {
      // Junta las filas seguidas de una tabla; la fila de guiones separa el encabezado.
      const filas = [];
      while (i < lineas.length && lineas[i].trim().startsWith('|')) { filas.push(lineas[i]); i++; }
      i--;
      const datos = filas.filter((f) => !/^\|?\s*:?-{2,}/.test(f.trim().replace(/^\|/, '')));
      const [enc, ...cuerpo] = datos.map(celdas);
      bloques.push(
        <div key={i} className="-mx-1 overflow-x-auto py-1">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-bone-500"><tr>{enc.map((c, j) => <th key={j} className="border-b border-white/10 px-2 py-2 font-semibold">{enLinea(c)}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/[.05]">
              {cuerpo.map((f, k) => <tr key={k}>{f.map((c, j) => <td key={j} className="px-2 py-2 align-top">{enLinea(c)}</td>)}</tr>)}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (!t) { bloques.push(<div key={i} className="h-1" />); continue; }
    if (/^-{3,}$/.test(t)) { bloques.push(<hr key={i} className="my-2 border-white/10" />); continue; }
    if (/^#{1,4}\s/.test(t)) { bloques.push(<p key={i} className="pt-2 font-bold text-bone">{enLinea(t.replace(/^#+\s/, ''))}</p>); continue; }
    const lista = t.match(/^(\d+[.)]|[-•*])\s+(.*)$/);
    if (lista) { bloques.push(<p key={i} className="flex gap-2 pl-1"><span className="shrink-0 font-mono text-obra">{/\d/.test(lista[1]) ? lista[1] : '•'}</span><span>{enLinea(lista[2])}</span></p>); continue; }
    bloques.push(<p key={i}>{enLinea(t)}</p>);
  }
  return <div className="space-y-1.5 text-[15px] leading-relaxed">{bloques}</div>;
}

export default function Recomendar() {
  const { obras, esGerente } = useDatos();
  const avisar = useToast();
  const [conv, setConv] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fin = useRef(null);
  const desuscribir = useRef(null);

  const obraEjemplo = obras.find((o) => o.estado !== 'terminada')?.nombre || 'la nueva obra';
  const SUGERENCIAS = [
    `Necesito 1 capataz y 4 maestros primera de enfierradura para ${obraEjemplo}`,
    'Los 5 mejores evaluados que estén disponibles hoy',
    '¿Quiénes son buenos en moldaje y nunca tuvieron problemas de alcohol o drogas?',
  ];

  const nueva = async () => {
    desuscribir.current?.();
    const c = await base44.agents.createConversation({ agent_name: AGENTE, metadata: { origen: 'recomendar' } });
    setConv(c);
    setMensajes([]);
    desuscribir.current = base44.agents.subscribeToConversation(c.id, (act) => setMensajes(act.messages || []));
    return c;
  };

  useEffect(() => () => desuscribir.current?.(), []);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [mensajes]);

  const enviar = async (contenido) => {
    const t = (contenido ?? texto).trim();
    if (!t || enviando) return;
    setEnviando(true);
    setTexto('');
    try {
      const c = conv ?? (await nueva());
      setMensajes((m) => [...m, { role: 'user', content: t, id: `local-${Date.now()}` }]);
      await base44.agents.addMessage(c, { role: 'user', content: t });
    } catch {
      avisar('No se pudo consultar al asistente', 'bad');
    } finally {
      setEnviando(false);
    }
  };

  const visibles = mensajes.filter((m) => !m.hidden && (m.role === 'user' || m.role === 'assistant'));
  const ultimo = visibles[visibles.length - 1];
  const pensando = enviando || (ultimo?.role === 'user') || (ultimo?.role === 'assistant' && !ultimo.content && ultimo.tool_calls?.length);
  const consultando = ultimo?.tool_calls?.some((t) => t.status === 'running');

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <Encabezado
        eyebrow="Asistente con IA"
        titulo="Recomendar cuadrilla"
        accion={conv && <button onClick={nueva} className="btn-ghost"><RotateCcw className="h-4 w-4" /> Nueva consulta</button>}
      >
        Pide los cargos y especialidades que necesitas. El asistente revisa el historial de evaluaciones, la experiencia y la disponibilidad{esGerente ? ' de todo el personal' : ''} y te propone a los mejores.
      </Encabezado>

      <div className="flex-1 space-y-4 pb-4">
        {!visibles.length && (
          <div className="slab blueprint p-6">
            <Sparkles className="mb-3 h-6 w-6 text-obra" />
            <p className="font-bold">¿Para qué obra estás armando la cuadrilla?</p>
            <p className="mt-1 text-sm text-bone-400">Por ejemplo:</p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGERENCIAS.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-left text-sm text-bone-200 transition-colors hover:border-obra/40 hover:bg-obra/[.06]">{s}</button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {visibles.map((m, i) => (
            <motion.div key={m.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }} className={m.role === 'user' ? 'flex justify-end' : ''}>
              {m.role === 'user' ? (
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-obra px-4 py-3 text-[15px] font-medium text-ink">{typeof m.content === 'string' ? m.content : ''}</p>
              ) : m.content ? (
                <div className="slab max-w-full p-5"><Texto texto={typeof m.content === 'string' ? m.content : JSON.stringify(m.content)} /></div>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
        {pensando && (
          <p className="flex items-center gap-2 text-sm text-bone-500">
            <Loader2 className="h-4 w-4 animate-spin text-obra" /> {consultando ? 'Revisando historial y evaluaciones…' : 'Pensando…'}
          </p>
        )}
        <div ref={fin} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="sticky bottom-24 z-30 md:bottom-6">
        <div className="slab flex items-end gap-2 p-2">
          <textarea
            aria-label="Escribe tu consulta"
            rows={1}
            className="max-h-40 min-h-[48px] flex-1 resize-none bg-transparent px-3 py-3 text-bone placeholder:text-bone-600 focus:outline-none"
            placeholder="Ej: 3 jornales y 2 maestros segunda de hormigón para Bodegas Lo Boza"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          />
          <button className="btn-primary h-12 w-12 shrink-0 p-0" disabled={!texto.trim() || enviando} aria-label="Enviar"><ArrowUp className="h-5 w-5" /></button>
        </div>
      </form>
    </div>
  );
}
