import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, ClipboardList, HardHat, LayoutGrid, LogOut, Bot, Building2, Sparkles, Upload, Users, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDatos } from '@/lib/datos';
import { etiquetaPerfil } from '@/lib/dominio';
import { Avatar } from '@/components/ui';
import { BotonSoporte } from '@/components/SoporteChat';
import TemaToggle from '@/components/TemaToggle';

export function Marca({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#FF5F1F" />
        <path d="M14 44h36M18 44V26l14-8 14 8v18" stroke="#0c0d0f" strokeWidth="5" fill="none" strokeLinejoin="round" />
        <path d="M27 44V33h10v11" stroke="#0c0d0f" strokeWidth="4" fill="none" />
      </svg>
      <span className="display text-lg tracking-tight">Cuadrilla</span>
    </div>
  );
}

export default function Shell({ children }) {
  const { usuario, esAdmin, esGerente, pendientes } = useDatos();
  const nav = esAdmin
    ? [
        { to: '/', label: 'Panel', icono: LayoutGrid, end: true },
        { to: '/trabajadores', label: 'Personal', icono: HardHat },
        { to: '/evaluar', label: 'Evaluar', icono: ClipboardCheck, badge: pendientes.length },
        { to: '/obras', label: 'Obras', icono: Building2 },
        { to: '/asistente', label: 'Asistente', icono: Bot },
        { to: '/recomendar', label: 'Recomendar', icono: Sparkles, soloDesktop: true },
        ...(esGerente ? [{ to: '/reportes', label: 'Reportes', icono: BarChart3, soloDesktop: true }] : []),
        ...(esGerente ? [{ to: '/importar', label: 'Importar', icono: Upload, soloDesktop: true }] : []),
        { to: '/equipo', label: 'Equipo', icono: Users, soloDesktop: true },
      ]
    : [
        { to: '/', label: 'Por evaluar', icono: ClipboardCheck, end: true, badge: pendientes.length },
        { to: '/mis-obras', label: 'Mis obras', icono: Building2 },
        { to: '/mis-evaluaciones', label: 'Mis evaluaciones', icono: ClipboardList },
      ];
  const navMovil = nav.filter((n) => !n.soloDesktop);

  return (
    <div className="min-h-dvh md:pl-64">
      {/* Barra lateral */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[.06] bg-ink-800/80 p-5 backdrop-blur-xl md:flex">
        <Marca className="mb-10 px-2" />
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="relative">
              {({ isActive }) => (
                <span className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${isActive ? 'text-bone' : 'text-bone-500 hover:text-bone-200'}`}>
                  {isActive && (
                    <motion.span layoutId="nav-activo" className="absolute inset-0 rounded-xl bg-white/[.06] ring-1 ring-white/10" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                  )}
                  {isActive && <motion.span layoutId="nav-barra" className="absolute -left-5 top-2 bottom-2 w-1 rounded-r bg-obra" />}
                  <n.icono className="relative h-[18px] w-[18px]" />
                  <span className="relative">{n.label}</span>
                  {!!n.badge && <span className="relative ml-auto rounded-full bg-obra px-2 py-0.5 font-mono text-[11px] font-bold text-ink">{n.badge}</span>}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <BotonSoporte className="mb-4 px-3 text-sm" usuario={usuario} />
          <div className="mb-4 flex items-center justify-between">
            <span className="px-3 text-xs font-semibold uppercase tracking-wider text-bone-500">Tema</span>
            <TemaToggle />
          </div>
          <p className="mb-3 flex flex-wrap gap-x-3 px-3 text-[11px] text-bone-600">
            <NavLink to="/legal/privacidad" className="hover:text-bone">Privacidad</NavLink>
            <NavLink to="/legal/seguridad" className="hover:text-bone">Seguridad</NavLink>
            <NavLink to="/legal/terminos" className="hover:text-bone">Términos</NavLink>
          </p>
          <div className="hazard mb-4 h-1.5 rounded-full opacity-80" />
          <div className="flex items-center gap-3 px-1">
            <Avatar nombre={usuario.full_name || usuario.email} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{usuario.full_name || usuario.email}</p>
              <p className="truncate text-xs text-bone-500">{etiquetaPerfil(usuario)}</p>
            </div>
            <button onClick={() => base44.auth.logout('/')} className="rounded-lg p-2 text-bone-500 transition-colors hover:bg-white/5 hover:text-bone" aria-label="Cerrar sesión">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Barra superior móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[.06] bg-ink/80 px-4 py-3 backdrop-blur-xl md:hidden" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <Marca />
        <div className="flex items-center gap-1">
          <TemaToggle />
          <BotonSoporte soloIcono usuario={usuario} />
          <button onClick={() => base44.auth.logout('/')} className="rounded-lg p-2 text-bone-500" aria-label="Cerrar sesión">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 md:px-10 md:pb-16 md:pt-10">{children}</main>

      {/* Navegación inferior móvil: los jefes de terreno usan el teléfono en obra */}
      <nav className="fixed inset-x-3 bottom-3 z-40 grid rounded-2xl border border-white/10 bg-ink-800/90 p-1.5 shadow-slab backdrop-blur-xl md:hidden" style={{ marginBottom: 'env(safe-area-inset-bottom)', gridTemplateColumns: `repeat(${navMovil.length}, minmax(0, 1fr))` }}>
        {navMovil.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            {({ isActive }) => (
              <span className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold ${isActive ? 'text-bone' : 'text-bone-500'}`}>
                {isActive && <motion.span layoutId="tab-activo" className="absolute inset-0 rounded-xl bg-white/[.07]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                <span className="relative">
                  <n.icono className={`h-5 w-5 ${isActive ? 'text-obra' : ''}`} />
                  {!!n.badge && <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-obra px-1 text-center font-mono text-[10px] font-bold leading-[18px] text-ink">{n.badge}</span>}
                </span>
                <span className="relative">{n.label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}