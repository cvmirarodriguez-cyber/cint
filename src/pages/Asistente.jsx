import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Loader2, Mic, MicOff, Paperclip, RotateCcw, Sparkles, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDatos } from '@/lib/datos';
import { Encabezado, ease, useToast } from '@/components/ui';

const AGENTE = 'asistente';

// Markdown mínimo: títulos, negritas, listas y tablas.
const enLinea = (l) =>
  l.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? <b key={i} className="text-bone">{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>,
  );
const celdas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function Texto({ texto }) {
  const lineas = String(texto || '').split('\n');
  const bloques = [];
  for (let i = 0; i < lineas.length; i++) {
    const t = lineas[i].trim();
    if (t.startsWith('|')) {
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

function LlamadaHerramienta({ toolCall }) {
  const [expandido, setExpandido] = useState(false);
  const fallido = ['failed', 'error'].includes(toolCall.status) || /error|failed/i.test(String(toolCall.results || '')) ||
    (() => { try { return JSON.parse(toolCall.results)?.success === false; } catch { return false; } })();
  const etiqueta = fallido ? 'Falló' : { pending: 'Pendiente', running: 'Consultando…', in_progress: 'Consultando…', completed: 'Listo', success: 'Listo' }[toolCall.status] || toolCall.status;
  const color = fallido ? 'text-alerta' : ['pending', 'running', 'in_progress'].includes(toolCall.status) ? 'text-obra' : 'text-ok';
  const nombre = toolCall.name?.replace(/_/g, ' ') || 'herramienta';
  return (
    <div className="mt-2 text-xs">
      <button onClick={() => setExpandido(!expandido)} className="flex items-center gap-2 text-bone-500 hover:text-bone-200">
        <span className={`h-1.5 w-1.5 rounded-full ${fallido ? 'bg-alerta' : ['pending', 'running', 'in_progress'].includes(toolCall.status) ? 'bg-obra animate-pulse' : 'bg-ok'}`} />
        <span className="capitalize">{nombre}</span>
        <span className={color}>{etiqueta}</span>
      </button>
      {expandido && (
        <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
          {toolCall.arguments_string && (
            <div>
              <p className="mb-1 font-semibold text-bone-400">Parámetros:</p>
              <pre className="whitespace-pre-wrap break-words text-bone-300">{(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}</pre>
            </div>
          )}
          {toolCall.results && (
            <div>
              <p className="mb-1 font-semibold text-bone-400">Resultado:</p>
              <pre className="whitespace-pre-wrap break-words text-bone-300">{(() => { try { return JSON.stringify(JSON.parse(toolCall.results), null, 2); } catch { return String(toolCall.results); } })()}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Burbuja({ mensaje }) {
  const esUsuario = mensaje.role === 'user';
  if (esUsuario) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] flex-col items-end gap-1.5">
          {mensaje.file_urls?.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {mensaje.file_urls.map((u) => (
                <span key={u} className="rounded-lg bg-obra/20 px-2.5 py-1 text-xs text-obra-300 ring-1 ring-obra/30">
                  📎 {u.split('/').pop().slice(-24)}
                </span>
              ))}
            </div>
          )}
          {mensaje.content && <p className="rounded-2xl rounded-br-md bg-obra px-4 py-3 text-[15px] font-medium text-ink">{mensaje.content}</p>}
        </div>
      </div>
    );
  }
  if (!mensaje.content && !mensaje.tool_calls?.length) return null;
  return (
    <div className="slab max-w-full p-5">
      {mensaje.content && <Texto texto={mensaje.content} />}
      {mensaje.tool_calls?.map((tc, i) => <LlamadaHerramienta key={i} toolCall={tc} />)}
    </div>
  );
}

export default function Asistente() {
  const { esGerente } = useDatos();
  const avisar = useToast();
  const [conv, setConv] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [archivos, setArchivos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [reconocimiento, setReconocimiento] = useState(null);
  const fin = useRef(null);
  const desuscribir = useRef(null);
  const entrada = useRef(null);

  const SUGERENCIAS = esGerente
    ? [
        'Resume cómo va el personal de la obra Bodegas Lo Boza',
        'Redacta un correo para citar a evaluación a los capataces pendientes',
        '¿Qué trabajadores tienen mejor desempeño histórico en hormigón?',
        'Compara los trabajadores de este Excel con los que ya tengo cargados',
      ]
    : [
        '¿Cómo evalúo a un trabajador que faltó mucho?',
        'Redacta un comentario profesional para alguien con desempeño 3',
        '¿Qué significa cada nota de 1 a 5?',
        'Ayúdame a redactar un reporte de mi obra para el gerente',
      ];

  const nueva = async () => {
    desuscribir.current?.();
    const c = await base44.agents.createConversation({ agent_name: AGENTE, metadata: { origen: 'asistente' } });
    setConv(c);
    setMensajes([]);
    desuscribir.current = base44.agents.subscribeToConversation(c.id, (act) => setMensajes(act.messages || []));
    return c;
  };

  useEffect(() => () => desuscribir.current?.(), []);
  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [mensajes]);

  // Reconocimiento de voz con la API del navegador.
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'es-CL';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setTexto((prev) => (prev ? prev + ' ' : '') + t);
      entrada.current?.focus();
    };
    rec.onend = () => setGrabando(false);
    rec.onerror = () => { setGrabando(false); avisar('No se pudo escuchar el audio', 'bad'); };
    setReconocimiento(rec);
  }, []);

  const toggleVoz = () => {
    if (!reconocimiento) { avisar('Tu navegador no soporta dictado por voz', 'bad'); return; }
    if (grabando) { reconocimiento.stop(); setGrabando(false); }
    else { try { reconocimiento.start(); setGrabando(true); } catch { setGrabando(false); } }
  };

  const quitarArchivo = (uri) => setArchivos((a) => a.filter((f) => f.uri !== uri));

  const subirArchivos = async (lista) => {
    if (!lista?.length) return;
    setSubiendo(true);
    try {
      const subidos = await Promise.all(
        Array.from(lista).map(async (f) => {
          const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: f });
          // Una hora: alcanza para escribir la consulta con calma antes de enviar.
          const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 3600 });
          return { nombre: f.name, uri: file_uri, url: signed_url };
        }),
      );
      setArchivos((a) => [...a, ...subidos]);
    } catch {
      avisar('No se pudieron subir los archivos', 'bad');
    } finally {
      setSubiendo(false);
    }
  };

  const enviar = async (contenido) => {
    const t = (contenido ?? texto).trim();
    if ((!t && !archivos.length) || enviando) return;
    setEnviando(true);
    const urlsAdjuntos = archivos.map((a) => a.url);
    const nombresAdjuntos = archivos.map((a) => a.nombre);
    setTexto('');
    setArchivos([]);
    try {
      const c = conv ?? (await nueva());
      const cuerpo = t || `Te subí ${nombresAdjuntos.length === 1 ? 'un archivo' : `${nombresAdjuntos.length} archivos`}: ${nombresAdjuntos.join(', ')}.`;
      setMensajes((m) => [...m, { role: 'user', content: cuerpo, file_urls: urlsAdjuntos, id: `local-${Date.now()}` }]);
      await base44.agents.addMessage(c, { role: 'user', content: cuerpo, file_urls: urlsAdjuntos });
    } catch {
      avisar('No se pudo enviar el mensaje', 'bad');
    } finally {
      setEnviando(false);
    }
  };

  const visibles = mensajes.filter((m) => !m.hidden && (m.role === 'user' || m.role === 'assistant'));
  const ultimo = visibles[visibles.length - 1];
  const pensando = enviando || ultimo?.role === 'user' || (ultimo?.role === 'assistant' && !ultimo.content && ultimo.tool_calls?.length);

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <Encabezado
        eyebrow="Asistente con IA"
        titulo="Asistente"
        accion={conv && <button onClick={nueva} className="btn-ghost"><RotateCcw className="h-4 w-4" /> Nueva conversación</button>}
      >
        Pregúntame lo que necesites: consultar personal, armar cuadrillas, redactar correos, analizar archivos. Puedes escribir, dictar por voz o subir documentos.
      </Encabezado>

      <div className="flex-1 space-y-4 pb-4">
        {!visibles.length && (
          <div className="slab blueprint p-6">
            <Sparkles className="mb-3 h-6 w-6 text-obra" />
            <p className="font-bold">¿En qué te ayudo hoy?</p>
            <p className="mt-1 text-sm text-bone-400">Algunas ideas:</p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGERENCIAS.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-left text-sm text-bone-200 transition-colors hover:border-obra/40 hover:bg-obra/[.06]">{s}</button>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {visibles.map((m, i) => (
            <motion.div key={m.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}>
              <Burbuja mensaje={m} />
            </motion.div>
          ))}
        </AnimatePresence>
        {pensando && (
          <p className="flex items-center gap-2 text-sm text-bone-500">
            <Loader2 className="h-4 w-4 animate-spin text-obra" /> Pensando…
          </p>
        )}
        <div ref={fin} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="sticky bottom-24 z-30 md:bottom-6">
        {/* Previsualización de archivos adjuntos */}
        {archivos.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {archivos.map((a) => (
              <span key={a.uri} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.05] px-2.5 py-1.5 text-xs text-bone-200">
                📎 {a.nombre.length > 26 ? a.nombre.slice(0, 24) + '…' : a.nombre}
                <button type="button" onClick={() => quitarArchivo(a.uri)} className="text-bone-500 hover:text-alerta" aria-label="Quitar archivo">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="slab flex items-end gap-1.5 p-2">
          <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center text-bone-400 transition-colors hover:text-obra" title="Adjuntar archivo">
            {subiendo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => { subirArchivos(e.target.files); e.target.value = ''; }}
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.csv,.xlsx,.docx,.txt,.md"
            />
          </label>
          <button
            type="button"
            onClick={toggleVoz}
            className={`grid h-12 w-12 shrink-0 place-items-center transition-colors ${grabando ? 'text-obra animate-pulse' : 'text-bone-400 hover:text-obra'}`}
            title={grabando ? 'Detener dictado' : 'Dictar por voz'}
            aria-label={grabando ? 'Detener dictado' : 'Dictar por voz'}
          >
            {grabando ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <textarea
            ref={entrada}
            aria-label="Escribe tu mensaje"
            rows={1}
            className="max-h-40 min-h-[48px] flex-1 resize-none bg-transparent px-2 py-3 text-bone placeholder:text-bone-600 focus:outline-none"
            placeholder="Escribe o dicta tu mensaje…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          />
          <button className="btn-primary h-12 w-12 shrink-0 p-0" disabled={(!texto.trim() && !archivos.length) || enviando || subiendo} aria-label="Enviar">
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}