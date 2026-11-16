import { Loader2 } from 'lucide-react';

export function Cargando({ texto }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-tinta-400">
      <div className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />{texto || 'Cargando…'}</div>
    </div>
  );
}

export function Marca({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/icono.svg" alt="" className="h-8 w-8" />
      <span className="font-display text-xl font-extrabold tracking-tight text-hoja">dividir</span>
    </div>
  );
}

const COLORES = ['#16a34a', '#f97316', '#0ea5e9', '#a855f7', '#e11d48', '#ca8a04', '#0d9488', '#6366f1'];
export const colorDe = (i) => COLORES[i % COLORES.length];

export function Avatar({ nombre, i, chico }) {
  const s = chico ? 'h-6 w-6 text-[11px]' : 'h-9 w-9 text-sm';
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white ${s}`} style={{ background: colorDe(i) }}>
      {(nombre || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function Aviso({ tipo = 'error', children }) {
  if (!children) return null;
  const c = tipo === 'error' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-hoja-100 text-hoja ring-hoja/20';
  return <p className={`rounded-xl px-4 py-3 text-sm ring-1 ${c}`}>{children}</p>;
}
