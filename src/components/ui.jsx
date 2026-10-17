import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { iniciales, NOTAS } from '@/lib/dominio';

export const ease = [0.23, 1, 0.32, 1];

const TONOS = {
  ok: 'border-ok/30 bg-ok/10 text-ok',
  warn: 'border-hivis/35 bg-hivis/10 text-hivis',
  bad: 'border-alerta/40 bg-alerta/10 text-alerta',
  obra: 'border-obra/40 bg-obra/10 text-obra-300',
  muted: 'border-white/10 bg-white/[.04] text-bone-400',
};

// Monta modales en <body>: la transición de página usa transform/filter y atraparía los position:fixed.
export const Capa = ({ children }) => createPortal(children, document.body);

export function Chip({ tono = 'muted', children, className = '' }) {
  return <span className={`chip ${TONOS[tono]} ${className}`}>{children}</span>;
}

export function colorNota(n) {
  if (n == null) return '#6a6965';
  if (n >= 4) return '#5BD68F';
  if (n >= 3) return '#FFC21A';
  return '#FF4141';
}

// Cuenta hacia el número cuando aparece.
export function Contador({ valor, decimales = 0, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const c = animate(0, valor || 0, {
      duration: 1.1,
      ease,
      onUpdate: (v) => { node.textContent = v.toFixed(decimales).replace('.', ','); },
    });
    return () => c.stop();
  }, [valor, decimales]);
  return <span ref={ref} className={`tabular-nums ${className}`}>0</span>;
}

// Anillo de nota 1–5.
export function Anillo({ valor, size = 72, grosor = 7, etiqueta = true }) {
  const r = (size - grosor) / 2;
  const c = 2 * Math.PI * r;
  const pct = valor ? (valor - 1) / 4 : 0;
  const color = colorNota(valor);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.07)" strokeWidth={grosor} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={grosor} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease }}
          style={{ filter: `drop-shadow(0 0 6px ${color}55)` }}
        />
      </svg>
      {etiqueta && (
        <span className="absolute font-mono font-bold tabular-nums" style={{ fontSize: size * 0.27, color: valor ? '#ECE9E2' : '#6a6965' }}>
          {valor ? valor.toFixed(1).replace('.', ',') : '—'}
        </span>
      )}
    </div>
  );
}

export function Avatar({ nombre, size = 44, alerta }) {
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-xl font-bold text-ink"
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: 'linear-gradient(145deg,#FF8A55,#E04A0E)',
        boxShadow: '0 1px 0 rgba(255,255,255,.4) inset, 0 -2px 0 rgba(0,0,0,.25) inset, 0 6px 16px -6px rgba(255,95,31,.6)',
        fontStretch: '115%',
      }}
    >
      {iniciales(nombre)}
      {alerta && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-ink-700 bg-alerta" />}
    </div>
  );
}

// Tarjeta con inclinación 3D siguiendo el puntero (solo en dispositivos con mouse).
export function Tilt({ children, className = '', max = 8 }) {
  const ref = useRef(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [max, -max]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(x, [0, 1], [-max, max]), { stiffness: 220, damping: 22 });
  const brillo = useTransform([x, y], ([a, b]) => `radial-gradient(500px circle at ${a * 100}% ${b * 100}%, rgba(255,255,255,.10), transparent 45%)`);
  const fino = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  return (
    <motion.div
      ref={ref}
      className={`relative [transform-style:preserve-3d] ${className}`}
      style={fino ? { rotateX: rx, rotateY: ry, transformPerspective: 900 } : undefined}
      onPointerMove={(e) => {
        if (!fino) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => { x.set(0.5); y.set(0.5); }}
    >
      {children}
      {fino && <motion.div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: brillo }} />}
    </motion.div>
  );
}

// Selector de nota 1–5 como medidor de barras que crecen.
export function Medidor({ valor, onChange, nombre }) {
  return (
    <div role="radiogroup" aria-label={nombre} className="flex items-end gap-1.5 sm:gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const activo = valor >= n;
        const color = colorNota(valor);
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            aria-label={`${n} – ${NOTAS[n]}`}
            onClick={() => onChange(n)}
            className="group relative flex flex-1 flex-col items-center gap-2 outline-none"
          >
            <div className="relative w-full overflow-hidden rounded-lg bg-white/[.05] ring-1 ring-white/10 transition-transform duration-150 group-active:scale-95" style={{ height: 22 + n * 11 }}>
              <motion.div
                className="absolute inset-x-0 bottom-0"
                initial={false}
                animate={{ height: activo ? '100%' : '0%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 32, delay: activo ? (n - 1) * 0.03 : 0 }}
                style={{ background: `linear-gradient(180deg, ${color}, ${color}aa)`, boxShadow: `0 0 18px ${color}66` }}
              />
            </div>
            <span className={`font-mono text-xs font-bold ${valor === n ? 'text-bone' : 'text-bone-600'}`}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

// Opciones tipo segmento.
export function Segmento({ opciones, valor, onChange, nombre }) {
  return (
    <div role="radiogroup" aria-label={nombre} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0,1fr))` }}>
      {opciones.map((o) => {
        const activo = valor === o.value;
        const borde = { ok: '#5BD68F', warn: '#FFC21A', bad: '#FF4141' }[o.tono] ?? '#FF5F1F';
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(o.value)}
            className={`relative rounded-xl border px-3 py-3 text-sm font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[.97] ${
              activo ? 'text-bone' : 'border-white/10 bg-white/[.03] text-bone-400 hover:bg-white/[.06]'
            }`}
            style={activo ? { borderColor: borde, background: `${borde}1a`, boxShadow: `0 0 0 1px ${borde}55 inset` } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Vacio({ icono: Icono, titulo, children }) {
  return (
    <div className="blueprint flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      {Icono && <Icono className="mb-3 h-8 w-8 text-bone-600" strokeWidth={1.5} />}
      <p className="font-semibold text-bone-200">{titulo}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-bone-500">{children}</div>}
    </div>
  );
}

export function Encabezado({ eyebrow, titulo, children, accion }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="display text-3xl sm:text-4xl lg:text-5xl">{titulo}</h1>
        {children && <p className="mt-3 max-w-xl text-bone-400">{children}</p>}
      </div>
      {accion}
    </header>
  );
}

// Aparición escalonada para listas.
export const lista = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
export const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } } };

const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const avisar = useCallback((texto, tono = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, texto, tono }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease }}
              className="slab pointer-events-auto flex items-center gap-3 px-4 py-3 text-sm font-semibold"
            >
              {t.tono === 'ok' ? <CheckCircle2 className="h-5 w-5 text-ok" /> : <AlertTriangle className="h-5 w-5 text-alerta" />}
              {t.texto}
              <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-bone-500 hover:text-bone" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
