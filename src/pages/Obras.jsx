import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Building2, MapPin, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDatos } from '@/lib/datos';
import { fecha } from '@/lib/dominio';
import { Capa, Chip, Encabezado, Tilt, Vacio, ease, item, lista, useToast } from '@/components/ui';

export function FormObra({ abierto, onClose, obra }) {
  const { E, recargar, contratos, esGerente } = useDatos();
  const avisar = useToast();
  const [f, setF] = useState(obra ?? { nombre: '', codigo: '', ubicacion: '', jefe_personal_email: '', jefe_personal_nombre: '', jefe_terreno_nombre: '', jefe_terreno_email: '', fecha_inicio: '', fecha_termino: '' });
  const [guardando, setGuardando] = useState(false);
  const [jefes, setJefes] = useState([]);
  const [personal, setPersonal] = useState([]);

  // Jefes de obra aprobados (los elige el jefe de personal de obra) y jefes de personal de obra (los asigna el gerente).
  useEffect(() => {
    if (!abierto) return;
    base44.functions.invoke('gestionar-acceso', { accion: 'listar' })
      .then((r) => {
        const us = r.data?.usuarios || [];
        setJefes(us.filter((u) => u.role !== 'admin' && u.acceso));
        setPersonal(us.filter((u) => u.role === 'admin' && u.perfil === 'jefe_personal'));
      })
      .catch(() => {});
  }, [abierto]);

  const elegirPersonal = (email) => {
    const j = personal.find((x) => x.email === email);
    setF((s) => ({ ...s, jefe_personal_email: email, jefe_personal_nombre: j?.full_name || '' }));
  };

  const elegirJefe = (email) => {
    const j = jefes.find((x) => x.email.toLowerCase() === email.toLowerCase());
    setF((s) => ({ ...s, jefe_terreno_email: email, jefe_terreno_nombre: j?.full_name || s.jefe_terreno_nombre }));
  };
  const campo = (k, props = {}) => (
    <input id={`ob-${k}`} className="field disabled:opacity-60" value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
  );

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { id, created_date, updated_date, created_by, created_by_id, ...datos } = f;
      datos.jefe_terreno_email = (datos.jefe_terreno_email || '').trim().toLowerCase();
      // Solo el gerente asigna jefe de personal de obra; el servidor rechaza ese campo a los demás.
      if (!esGerente) { delete datos.jefe_personal_email; delete datos.jefe_personal_nombre; }
      if (obra) {
        await E.Obra.update(obra.id, datos);
        const deLaObra = contratos.filter((c) => c.obra_id === obra.id);
        // Si cambió el jefe de obra, los contratos abiertos pasan a él para que los evalúe.
        if (datos.jefe_terreno_email !== (obra.jefe_terreno_email || '')) {
          await Promise.all(deLaObra.filter((c) => c.estado !== 'evaluado').map((c) => E.Contrato.update(c.id, { jefe_terreno_email: datos.jefe_terreno_email })));
        }
        // Si el gerente cambió al jefe de personal de obra, toda la cuadrilla (incluido su historial) pasa a él.
        if (esGerente && (datos.jefe_personal_email || '') !== (obra.jefe_personal_email || '')) {
          await Promise.all(deLaObra.map((c) => E.Contrato.update(c.id, { jefe_personal_email: datos.jefe_personal_email || '' })));
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
            <div><label className="label" htmlFor="ob-nombre">Nombre</label>{campo('nombre', { required: true, placeholder: 'Edificio Los Aromos', disabled: !esGerente })}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="ob-codigo">Código</label>{campo('codigo', { placeholder: 'OB-2026-14', disabled: !esGerente })}</div>
              <div><label className="label" htmlFor="ob-ubicacion">Ubicación</label>{campo('ubicacion', { placeholder: 'Comuna', disabled: !esGerente })}</div>
            </div>
            <div className="rounded-xl border border-obra/25 bg-obra/[.05] p-4">
              <label className="label" htmlFor="ob-jefe_personal_email">Jefe de personal de obra a cargo</label>
              {esGerente ? (
                <select id="ob-jefe_personal_email" className="field" value={f.jefe_personal_email || ''} onChange={(e) => elegirPersonal(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {personal.map((p) => <option key={p.id} value={p.email}>{p.full_name || p.email}</option>)}
                  {f.jefe_personal_email && !personal.some((p) => p.email === f.jefe_personal_email) && <option value={f.jefe_personal_email}>{f.jefe_personal_nombre || f.jefe_personal_email}</option>}
                </select>
              ) : (
                <p className="font-semibold">{f.jefe_personal_nombre || f.jefe_personal_email || 'Sin asignar'}</p>
              )}
              <p className="mt-2 text-xs text-bone-500">{esGerente ? 'Lo designa el gerente de RRHH. Esa persona arma la cuadrilla y elige al jefe de obra.' : 'Asignado por el gerente de RRHH.'}</p>
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
              <div><label className="label" htmlFor="ob-fecha_inicio">Inicio</label>{campo('fecha_inicio', { type: 'date', disabled: !esGerente })}</div>
              <div><label className="label" htmlFor="ob-fecha_termino">Término estimado</label>{campo('fecha_termino', { type: 'date', disabled: !esGerente })}</div>
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
  const { obras, contratos, cargando, esGerente } = useDatos();
  const [nueva, setNueva] = useState(false);

  return (
    <div>
      <Encabezado
        eyebrow={`${obras.length} ${esGerente ? 'obras' : 'obras a tu cargo'}`}
        titulo="Obras"
        accion={esGerente && <button onClick={() => setNueva(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nueva obra</button>}
      >
        {esGerente
          ? 'Crea las obras y designa al jefe de personal de obra a cargo de cada una.'
          : 'Las obras que te asignó el gerente de RRHH. Arma su cuadrilla, elige al jefe de obra y marca los términos de contrato.'}
      </Encabezado>

      {!cargando && !obras.length ? (
        <Vacio icono={Building2} titulo={esGerente ? 'Aún no hay obras' : 'Aún no tienes obras asignadas'}>
          {esGerente ? 'Crea la primera y asígnale un jefe de personal de obra.' : 'Cuando el gerente de RRHH te asigne una obra, aparecerá aquí.'}
        </Vacio>
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
                          <p className={`mt-2 truncate text-xs ${o.jefe_personal_email ? 'text-bone-400' : 'font-semibold text-hivis'}`}>
                            {o.jefe_personal_email ? <>Jefe de personal de obra: <b className="text-bone-200">{o.jefe_personal_nombre || o.jefe_personal_email}</b></> : 'Sin jefe de personal de obra asignado'}
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
