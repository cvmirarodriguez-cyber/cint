import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDatos } from '@/lib/datos';
import { Encabezado, ease, useToast } from '@/components/ui';

const AGENTE = 'recomendador';

// Markdown mínimo: negritas y listas, suficiente para las respuestas del agente.
function Texto({ texto }) {
  const lineas = String(texto || '').split('\n');
  const enLinea = (l) => l.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <b key={i} className="text-bone">{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>));
  return (
    <div className="space-y-1.5 text-[15px] leading-relaxed">
      {lineas.map((l, i) => {
        const t = l.trim();
        if (!t) return <div key={i} className="h-1" />;
        const lista = t.match(/^(\d+[.)]|[-•*])\s+(.*)$/);
        if (lista) return <p key={i} className="flex gap-2 pl-1"><span className="shrink-0 font-mono text-obra">{/\d/.test(lista[1]) ? lista[1] : '•'}</span><span>{enLinea(lista[2])}</span></p>;
        if (/^#{1,3}\s/.test(t)) return <p key={i} className="pt-1 font-bold text-bone">{t.replace(/^#+\s/, '')}</p>;
        return <p key={i}>{enLinea(t)}</p>;
      })}
    </div>
  );
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
