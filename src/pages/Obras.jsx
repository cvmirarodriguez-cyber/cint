import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Building2, MapPin, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDatos } from '@/lib/datos';
import { fecha } from '@/lib/dominio';
import { Capa, Chip, Encabezado, Tilt, Vacio, ease, item, lista, useToast } from '@/components/ui';

export function FormObra({ abierto, onClose, obra }) {
  const { E, recargar, contratos } = useDatos();
  const avisar = useToast();
  const [f, setF] = useState(obra ?? { nombre: '', codigo: '', ubicacion: '', jefe_terreno_nombre: '', jefe_terreno_email: '', fecha_inicio: '', fecha_termino: '' });
  const [guardando, setGuardando] = useState(false);
  const [jefes, setJefes] = useState([]);

  // Sugiere los jefes de obra con acceso aprobado.
  useEffect(() => {
    if (!abierto) return;
    base44.functions.invoke('gestionar-acceso', { accion: 'listar' })
      .then((r) => setJefes((r.data?.usuarios || []).filter((u) => u.role !== 'admin' && u.acceso)))
      .catch(() => {});
  }, [abierto]);

  const elegirJefe = (email) => {
    const j = jefes.find((x) => x.email.toLowerCase() === email.toLowerCase());
    setF((s) => ({ ...s, jefe_terreno_email: email, jefe_terreno_nombre: j?.full_name || s.jefe_terreno_nombre }));
  };
  const campo = (k, props = {}) => (
    <input id={`ob-${k}`} className="field" value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
  );

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { id, created_date, updated_date, created_by, created_by_id, ...datos } = f;
      datos.jefe_terreno_email = (datos.jefe_terreno_email || '').trim().toLowerCase();
      if (obra) {
        await E.Obra.update(obra.id, datos);
        // Si cambió el jefe, los contratos abiertos pasan a él para que los evalúe.
        if (datos.jefe_terreno_email !== (obra.jefe_terreno_email || '')) {
          const abiertos = contratos.filter((c) => c.obra_id === obra.id && c.estado !== 'evaluado');
          await Promise.all(abiertos.map((c) => E.Contrato.update(c.id, { jefe_terreno_email: datos.jefe_terreno_email })));
        }
      } else {
        await E.Obra.create({ ...datos, nombre: datos.nombre.trim(), estado: 'en_curso' });
      }
      await recargar();
      avisar(obra ? 'Obra actualizada' : 'Obra creada');
      onClose();
    } catch {
      avisar('No se pudo guardar', 'bad');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Capa>
    <AnimatePresence>
      {abierto && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.form onSubmit={guardar} onClick={(e) => e.stopPropagation()} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.35, ease }}
            className="slab max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-b-none p-6 sm:rounded-2xl" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between">
              <h2 className="display text-2xl">{obra ? 'Editar obra' : 'Nueva obra'}</h2>
              <button type="button" onClick={onClose} className="rounded-lg p-2 text-bone-500 hover:bg-white/5" aria-label="Cerrar"><X className="h-5 w-5" /></button>
            </div>
            <div><label className="label" htmlFor="ob-nombre">Nombre</label>{campo('nombre', { required: true, placeholder: 'Edificio Los Aromos' })}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="ob-codigo">Código</label>{campo('codigo', { placeholder: 'OB-2026-14' })}</div>
              <div><label className="label" htmlFor="ob-ubicacion">Ubicación</label>{campo('ubicacion', { placeholder: 'Comuna' })}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ob-jefe_terreno_email">Correo del jefe de obra</label>
                <input id="ob-jefe_terreno_email" className="field" type="email" list="ob-jefes" placeholder="jefe@empresa.cl" value={f.jefe_terreno_email || ''} onChange={(e) => elegirJefe(e.target.value)} />
                <datalist id="ob-jefes">{jefes.map((j) => <option key={j.id} value={j.email}>{j.full_name}</option>)}</datalist>
              </div>
              <div><label className="label" htmlFor="ob-jefe_terreno_nombre">Nombre del jefe de obra</label>{campo('jefe_terreno_nombre')}</div>
            </div>
            <p className="-mt-2 text-xs text-bone-500">Solo ese correo podrá ver y evaluar los términos de contrato de esta obra.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="ob-fecha_inicio">Inicio</label>{campo('fecha_inicio', { type: 'date' })}</div>
              <div><label className="label" htmlFor="ob-fecha_termino">Término estimado</label>{campo('fecha_termino', { type: 'date' })}</div>
            </div>
            <button className="btn-primary w-full" disabled={guardando || !f.nombre?.trim()}>Guardar</button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
    </Capa>
  );
}

export default function Obras() {
  const { obras, contratos, cargando } = useDatos();
  const [nueva, setNueva] = useState(false);

  return (
    <div>
      <Encabezado eyebrow={`${obras.length} obras`} titulo="Obras" accion={<button onClick={() => setNueva(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nueva obra</button>}>
        Arma la cuadrilla de cada obra y marca los términos de contrato para que el jefe de obra los evalúe.
      </Encabezado>

      {!cargando && !obras.length ? (
        <Vacio icono={Building2} titulo="Aún no hay obras">Crea la primera para asignar su cuadrilla.</Vacio>
      ) : (
        <motion.ul variants={lista} initial="hidden" animate="show" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {obras.map((o) => {
            const cs = contratos.filter((c) => c.obra_id === o.id);
            const vig = cs.filter((c) => c.estado === 'vigente').length;
            const pen = cs.filter((c) => c.estado === 'pendiente').length;
            const ev = cs.filter((c) => c.estado === 'evaluado').length;
            const total = cs.length || 1;
            return (
              <motion.li key={o.id} variants={item}>
                <Link to={`/obras/${o.id}`} className="block">
                  <Tilt className="slab slab-hover group overflow-hidden rounded-2xl" max={7}>
                    <div className="blueprint relative h-24 border-b border-white/[.06]">
                      {/* Mini elevación del edificio según avance de evaluaciones */}
                      <div className="absolute bottom-0 left-5 flex items-end gap-1">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <motion.span key={i} className="w-4 rounded-t-sm" style={{ background: i < Math.round((ev / total) * 7) ? '#FF5F1F' : 'rgba(255,255,255,.08)' }}
                            initial={{ height: 0 }} animate={{ height: 18 + ((i * 37) % 50) }} transition={{ duration: 0.6, ease, delay: 0.1 + i * 0.05 }} />
                        ))}
                      </div>
                      <div className="absolute right-4 top-4">
                        <Chip tono={o.estado === 'terminada' ? 'muted' : 'obra'}>{o.estado === 'terminada' ? 'Terminada' : 'En curso'}</Chip>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-bold">{o.nombre}</p>
                          <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-bone-500">
                            {o.ubicacion && <><MapPin className="h-3.5 w-3.5" />{o.ubicacion} · </>}{o.codigo || fecha(o.fecha_inicio)}
                          </p>
                        </div>
                        <ArrowUpRight className="h-5 w-5 shrink-0 text-bone-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-obra" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        {[[vig, 'Vigentes', 'text-bone'], [pen, 'Por evaluar', 'text-obra'], [ev, 'Evaluados', 'text-ok']].map(([n, l, c]) => (
                          <div key={l} className="rounded-xl bg-white/[.03] py-2">
                            <p className={`display text-xl ${c}`}>{n}</p>
                            <p className="text-[11px] text-bone-500">{l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Tilt>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
      <FormObra abierto={nueva} onClose={() => setNueva(false)} key={nueva ? 'a' : 'c'} />
    </div>
  );
}
