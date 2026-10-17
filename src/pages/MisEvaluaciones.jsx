import { motion } from 'framer-motion';
import { ClipboardCheck, MessageSquareQuote } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { AD, NOTAS, RECONTRATAR, cargoLabel, fecha, nota } from '@/lib/dominio';
import { formatearRut } from '@/lib/rut';
import { Chip, Encabezado, Vacio, colorNota, item, lista } from '@/components/ui';

// El jefe de obra solo ve lo que él mismo evaluó (el servidor filtra el resto).
export default function MisEvaluaciones() {
  const { evaluaciones, cargando } = useDatos();
  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado eyebrow={`${evaluaciones.length} evaluaciones`} titulo="Mis evaluaciones">
        Lo que registraste al término de cada contrato. El historial completo de cada trabajador lo administra el jefe de personal.
      </Encabezado>
      {!cargando && !evaluaciones.length ? (
        <Vacio icono={ClipboardCheck} titulo="Aún no evalúas a nadie" />
      ) : (
        <motion.ul variants={lista} initial="hidden" animate="show" className="space-y-3">
          {evaluaciones.map((e) => {
            const n = nota(e);
            const ad = AD[e.alcohol_drogas] ?? AD.sin_observaciones;
            const rc = RECONTRATAR[e.recontratar] ?? RECONTRATAR.si;
            return (
              <motion.li key={e.id} variants={item} className="slab p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{e.trabajador_nombre}</p>
                    <p className="truncate text-xs text-bone-500">{formatearRut(e.trabajador_rut)} · {cargoLabel(e.cargo)} · {e.obra_nombre} · {fecha(e.fecha_termino)}</p>
                  </div>
                  <span className="display text-3xl" style={{ color: colorNota(n) }}>{n.toFixed(1).replace('.', ',')}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip>Desempeño {e.desempeno} · {NOTAS[e.desempeno]}</Chip>
                  <Chip>Responsabilidad {e.responsabilidad} · {NOTAS[e.responsabilidad]}</Chip>
                  <Chip tono={ad.tono}>A/D: {ad.label}</Chip>
                  <Chip tono={rc.tono}>Recontratar: {rc.label}</Chip>
                </div>
                {e.comentario && (
                  <p className="mt-3 flex gap-2 border-l-2 border-obra/50 pl-3 text-sm italic text-bone-200">
                    <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-bone-600" />{e.comentario}
                  </p>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}
