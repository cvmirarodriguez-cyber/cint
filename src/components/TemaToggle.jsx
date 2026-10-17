import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTema, toggleTema } from '@/lib/theme';

// Botón para alternar entre modo claro y oscuro.
export default function TemaToggle({ className = '' }) {
  const [modo, setModo] = useState(getTema());
  const claro = modo === 'light';
  return (
    <button
      onClick={() => setModo(toggleTema())}
      className={`relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-bone-400 transition-colors hover:text-bone ${className}`}
      aria-label={claro ? 'Activar modo oscuro' : 'Activar modo claro'}
      title={claro ? 'Modo oscuro' : 'Modo claro'}
    >
      {claro ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}