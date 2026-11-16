import { Loader2 } from 'lucide-react';
import { clp } from '@/lib/util';

export function Cargando({ texto }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-tinta-400">
      <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{texto || 'Cargando…'}</div>
    </div>
  );
}

export function Marca({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/icono.svg" alt="" className="h-8 w-8" />
      <span className="text-[19px] font-extrabold tracking-[-0.04em]">dividir<span className="text-verde">.</span></span>
    </div>
  );
}

const COLORES = ['#0b6e4f', '#b45309', '#1d4ed8', '#7c3aed', '#be123c', '#0f766e', '#4d7c0f', '#9333ea'];
export const colorDe = (i) => COLORES[((i % COLORES.length) + COLORES.length) % COLORES.length];

export function Avatar({ nombre, i, chico }) {
  const s = chico ? 'h-6 w-6 text-[11px]' : 'h-9 w-9 text-sm';
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ${s}`} style={{ background: colorDe(i) }}>
      {(nombre || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function Aviso({ tipo = 'error', children }) {
  if (!children) return null;
  const c = tipo === 'error' ? 'bg-red-50 text-red-800 ring-red-200' : tipo === 'ambar' ? 'bg-ambar-100 text-ambar ring-ambar/20' : 'bg-verde-100 text-verde ring-verde/20';
  return <p className={`mt-3 rounded-xl px-4 py-3 text-sm ring-1 ${c}`}>{children}</p>;
}

/* Boleta impresa: bordes dentados arriba y abajo. */
export function Ticket({ children, className = '', imprime }) {
  return (
    <div className={`ticket-sombra ${imprime ? 'imprime' : ''}`}>
      <div className={`ticket ticket-papel ${className}`}>{children}</div>
    </div>
  );
}

export function Perforacion() {
  return <div className="perforacion" aria-hidden="true" />;
}

/* Línea de boleta con puntos guía: "Pisco sour ........ $11.000" */
export function Linea({ izq, der, sub, fuerte, className = '' }) {
  return (
    <div className={`py-1 ${className}`}>
      <div className={`flex items-baseline text-[14px] ${fuerte ? 'font-semibold' : ''}`}>
        <span className="min-w-0 truncate">{izq}</span>
        <span className="puntos" />
        <span className="num shrink-0">{typeof der === 'number' ? clp(der) : der}</span>
      </div>
      {sub && <div className="text-xs text-tinta-400">{sub}</div>}
    </div>
  );
}

export function EncabezadoBoleta({ restoran, codigo, fecha }) {
  return (
    <div className="text-center">
      <p className="text-[17px] font-extrabold uppercase tracking-[.06em]">{restoran || 'Mesa sin nombre'}</p>
      <p className="etiqueta mt-1">
        {codigo ? `Mesa ${codigo}` : 'Cuenta'} · {new Date(fecha || Date.now()).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

export function Sello({ texto = 'PAGADO', className = '' }) {
  return <span className={`sello inline-block text-verde ${className}`}>{texto}</span>;
}
