import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, LifeBuoy, Loader2, MessageCircle, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { enlaceWhatsApp } from '@/lib/soporte';
import { Capa, ease } from '@/components/ui';

const BIENVENIDA = { rol: 'asistente', texto: 'Hola, soy el asistente de soporte de Cuadrilla. ¿En qué te ayudo? Por ejemplo: cómo entrar con tu invitación, qué hace cada cargo o cómo evaluar.' };
const RAPIDAS = ['No puedo entrar', 'Me invitaron, ¿cómo activo mi acceso?', '¿Qué puede hacer un jefe de obra?'];

export function BotonSoporte({ className = '', soloIcono = false }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      {soloIcono ? (
        <button type="button" onClick={() => setAbierto(true)} className={`rounded-lg p-2 text-bone-500 ${className}`} aria-label="Solicitar soporte">
          <LifeBuoy className="h-5 w-5" />
        </button>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} className={`inline-flex items-center gap-1.5 font-semibold text-obra-300 hover:underline ${className}`}>
          <LifeBuoy className="h-4 w-4" /> Solicitar soporte
        </button>
      )}
      <SoporteChat abierto={abierto} onClose={() => setAbierto(false)} />
    </>
  );
}

export default function SoporteChat({ abierto, onClose }) {
  const [mensajes, setMensajes] = useState([BIENVENIDA]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [derivar, setDerivar] = useState(false);
  const fin = useRef(null);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [mensajes, enviando]);

  const enviar = async (contenido) => {
    const t = (contenido ?? texto).trim().slice(0, 600);
    if (!t || enviando) return;
    const nuevos = [...mensajes, { rol: 'usuario', texto: t }];
    setMensajes(nuevos);
    setTexto('');
    setEnviando(true);
    try {
      const r = await base44.functions.invoke('soporte-chat', { mensajes: nuevos.slice(1) });
      setMensajes((m) => [...m, { rol: 'asistente', texto: r.data?.respuesta || 'No pude responder.' }]);
      if (r.data?.derivar) setDerivar(true);
    } catch {
      setMensajes((m) => [...m, { rol: 'asistente', texto: 'No pude responder en este momento. Te conecto con soporte.' }]);
      setDerivar(true);
    } finally {
      setEnviando(false);
    }
  };

  const ultimaPregunta = [...mensajes].reverse().find((m) => m.rol === 'usuario')?.texto || '';
  const whatsapp = enlaceWhatsApp(`Hola, necesito ayuda con Cuadrilla: ${ultimaPregunta}`);

  return (
    <Capa>
      <AnimatePresence>
        {abierto && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.35, ease }}
              className="slab flex h-[min(640px,88dvh)] w-full max-w-md flex-col rounded-b-none sm:rounded-2xl" role="dialog" aria-label="Soporte de Cuadrilla">
              <div className="flex items-center gap-3 border-b border-white/[.06] p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-obra/15"><LifeBuoy className="h-5 w-5 text-obra" /></div>
                <div className="flex-1">
                  <p className="font-bold">Soporte Cuadrilla</p>
                  <p className="text-xs text-bone-500">Asistente con IA · responde al instante</p>
                </div>
                <button onClick={onClose} className="rounded-lg p-2 text-bone-500 hover:bg-white/5" aria-label="Cerrar"><X className="h-5 w-5" /></button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {mensajes.map((m, i) => (
                  <div key={i} className={m.rol === 'usuario' ? 'flex justify-end' : ''}>
                    <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[15px] ${m.rol === 'usuario' ? 'rounded-br-md bg-obra font-medium text-ink' : 'rounded-bl-md bg-white/[.05] text-bone-200'}`}>{m.texto}</p>
                  </div>
                ))}
                {mensajes.length === 1 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {RAPIDAS.map((r) => <button key={r} onClick={() => enviar(r)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-bone-300 hover:border-obra/40 hover:text-bone">{r}</button>)}
                  </div>
                )}
                {enviando && <p className="flex items-center gap-2 text-sm text-bone-500"><Loader2 className="h-4 w-4 animate-spin text-obra" /> Escribiendo…</p>}
                {derivar && (
                  <div className="rounded-xl border border-ok/30 bg-ok/[.06] p-3">
                    <p className="text-sm text-bone-200">Para esto te ayuda una persona del equipo de soporte.</p>
                    {whatsapp ? (
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn mt-3 w-full bg-[#25D366] text-ink hover:brightness-105">
                        <MessageCircle className="h-4 w-4" /> Hablar con soporte por WhatsApp
                      </a>
                    ) : (
                      <p className="mt-2 text-xs text-bone-500">Escríbele al gerente de RRHH de tu empresa.</p>
                    )}
                  </div>
                )}
                <div ref={fin} />
              </div>

              <form onSubmit={(e) => { e.preventDefault(); enviar(); }} className="flex items-end gap-2 border-t border-white/[.06] p-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <input aria-label="Tu pregunta" className="field flex-1 py-2.5" maxLength={600} placeholder="Escribe tu pregunta…" value={texto} onChange={(e) => setTexto(e.target.value)} />
                <button className="btn-primary h-11 w-11 shrink-0 p-0" disabled={!texto.trim() || enviando} aria-label="Enviar"><ArrowUp className="h-5 w-5" /></button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Capa>
  );
}
