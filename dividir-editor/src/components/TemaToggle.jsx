import { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { guardarPreferencia, leerPreferencia } from '@/lib/tema';

const OPCIONES = [
  { id: 'claro', i: Sun, t: 'Claro' },
  { id: 'oscuro', i: Moon, t: 'Oscuro' },
  { id: 'sistema', i: Monitor, t: 'Automático' },
];

export default function TemaToggle({ className = '' }) {
  const [pref, setPref] = useState(leerPreferencia);
  return (
    <div role="radiogroup" aria-label="Tema" className={`inline-flex rounded-full bg-papel-oscuro p-0.5 ${className}`}>
      {OPCIONES.map(({ id, i: I, t }) => (
        <button
          key={id}
          role="radio"
          aria-checked={pref === id}
          aria-label={t}
          title={t}
          onClick={() => { setPref(id); guardarPreferencia(id); }}
          className={`grid h-7 w-7 place-items-center rounded-full transition ${pref === id ? 'bg-papel-claro text-tinta shadow-sm' : 'text-tinta-400'}`}
        >
          <I className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
