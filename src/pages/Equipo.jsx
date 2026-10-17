import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, HardHat, Mail, ShieldCheck, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDatos } from '@/lib/datos';
import { PERFILES, fecha } from '@/lib/dominio';
import { Avatar, Chip, Encabezado, Segmento, Vacio, item, lista, useToast } from '@/components/ui';

const OPCIONES = ['jefe_obra', 'jefe_personal', 'gerente_rrhh'].map((value) => ({ value, label: PERFILES[value].label }));

const DESCRIPCION = {
  gerente_rrhh: { icono: Crown, color: 'text-obra', texto: 'Maneja todos los datos. Crea las obras, designa al jefe de personal de obra de cada una, invita a todo el equipo y define los cargos.' },
  jefe_personal: { icono: ShieldCheck, color: 'text-hivis', texto: 'Ve la base de personal y los historiales. En las obras que le asigna el gerente elige a los trabajadores y al jefe de obra, y marca los términos de contrato.' },
  jefe_obra: { icono: HardHat, color: 'text-bone-300', texto: 'Evalúa a los trabajadores de su obra al término de su contrato y ve sus propias evaluaciones. No ve la base de personal ni el historial.' },
};

const gestionar = (datos) => base44.functions.invoke('gestionar-acceso', datos).then((r) => r.data);

function Interruptor({ activo, onClick, disabled, etiqueta }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40 ${activo ? 'bg-ok' : 'bg-white/10'}`}
    >
      <motion.span className="absolute top-1 h-5 w-5 rounded-full bg-bone shadow" animate={{ left: activo ? 24 : 4 }} transition={{ type: 'spring', stiffness: 600, damping: 35 }} />
    </button>
  );
}

export default function Equipo() {
  const avisar = useToast();
  const { usuario, esGerente } = useDatos();
  // El jefe de personal de obra solo invita y aprueba jefes de obra.
  const cargos = esGerente ? ['gerente_rrhh', 'jefe_personal', 'jefe_obra'] : ['jefe_obra'];
  const [usuarios, setUsuarios] = useState(null);
  const [cambiando, setCambiando] = useState(null);
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState('jefe_obra');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(() => gestionar({ accion: 'listar' }).then((d) => setUsuarios(d.usuarios)).catch(() => setUsuarios([])), []);
  useEffect(() => { cargar(); }, [cargar]);

  const alternar = async (u) => {
    setCambiando(u.id);
    try {
      await gestionar({ accion: 'cambiar', userId: u.id, acceso: !u.acceso });
      setUsuarios((xs) => xs.map((x) => (x.id === u.id ? { ...x, acceso: !u.acceso } : x)));
      avisar(u.acceso ? 'Acceso revocado' : `${u.full_name || u.email} ya puede entrar`);
    } catch {
      avisar('No se pudo cambiar el acceso', 'bad');
    } finally {
      setCambiando(null);
    }
  };

  const cambiarPerfil = async (u, nuevo) => {
    setCambiando(u.id);
    try {
      await gestionar({ accion: 'perfil', userId: u.id, perfil: nuevo });
      setUsuarios((xs) => xs.map((x) => (x.id === u.id ? { ...x, perfil: nuevo } : x)));
      avisar(`${u.full_name || u.email} ahora es ${PERFILES[nuevo].label}`);
    } catch {
      avisar('No se pudo cambiar el cargo', 'bad');
    } finally {
      setCambiando(null);
    }
  };

  const invitar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const correo = email.trim().toLowerCase();
      await base44.users.inviteUser(correo, PERFILES[perfil].rol);
      // Al crear su cuenta recibe su cargo (y, si es jefe de obra, su acceso) automáticamente.
      await base44.entities.Autorizado.create({ email: correo, perfil, invitado_por: usuario.email });
      avisar(`Invitación enviada como ${PERFILES[perfil].label}.`);
      setEmail('');
      cargar();
    } catch {
      avisar('No se pudo enviar la invitación', 'bad');
    } finally {
      setEnviando(false);
    }
  };

  const pendientes = (usuarios || []).filter((u) => !u.acceso).length;

  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado eyebrow="Accesos" titulo="Equipo">
        Cuadrilla es solo por invitación. Quien entre sin invitación no ve nada; aquí puedes darle acceso o quitárselo.
      </Encabezado>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-bone-400">
          Usuarios {pendientes > 0 && <Chip tono="warn">{pendientes} por aprobar</Chip>}
        </h2>
        {usuarios === null ? (
          <div className="slab h-32 animate-pulse" />
        ) : !usuarios.length ? (
          <Vacio icono={UserCheck} titulo="Sin usuarios todavía" />
        ) : (
          <motion.ul variants={lista} initial="hidden" animate="show" className="slab divide-y divide-white/[.05] overflow-hidden">
            {[...usuarios].sort((a, b) => a.acceso - b.acceso).map((u) => (
              <motion.li key={u.id} variants={item} className={`flex items-center gap-3 px-4 py-3.5 ${u.acceso ? '' : 'bg-hivis/[.04]'}`}>
                <Avatar nombre={u.full_name || u.email} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.full_name || u.email}</p>
                  <p className="truncate text-xs text-bone-500">{u.email} · desde {fecha(u.created_date)}</p>
                </div>
                {esGerente && u.role === 'admin' && u.id !== usuario.id ? (
                  <select
                    aria-label={`Cargo de ${u.email}`}
                    value={u.perfil}
                    disabled={cambiando === u.id}
                    onChange={(e) => cambiarPerfil(u, e.target.value)}
                    className="rounded-lg border border-white/10 bg-ink-800 px-2 py-1.5 text-xs font-semibold text-bone"
                  >
                    <option value="gerente_rrhh">Gerente de RRHH</option>
                    <option value="jefe_personal">Jefe de personal de obra</option>
                  </select>
                ) : (
                  <Chip tono={u.perfil === 'gerente_rrhh' ? 'obra' : u.role === 'admin' ? 'warn' : 'muted'}>{PERFILES[u.perfil]?.label}</Chip>
                )}
                {!u.acceso && <Chip tono="warn" className="hidden sm:inline-flex">Pendiente</Chip>}
                <Interruptor
                  activo={u.acceso}
                  etiqueta={`Acceso de ${u.email}`}
                  disabled={u.role === 'admin' || u.id === usuario.id || cambiando === u.id}
                  onClick={() => alternar(u)}
                />
              </motion.li>
            ))}
          </motion.ul>
        )}
        <p className="mt-2 text-xs text-bone-600">El gerente de RRHH y los jefes de personal de obra no necesitan aprobación.</p>
      </section>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-bone-400">Invitar</h2>
      <div className={`mb-4 grid grid-cols-1 gap-3 ${cargos.length > 1 ? 'sm:grid-cols-3' : ''}`}>
        {cargos.map((k) => {
          const { icono: Icono, color, texto } = DESCRIPCION[k];
          return (
            <div key={k} className={`slab p-5 ${perfil === k ? 'ring-1 ring-obra/50' : ''}`}>
              <Icono className={`mb-3 h-5 w-5 ${color}`} />
              <p className="font-bold">{PERFILES[k].label}</p>
              <p className="mt-1 text-sm text-bone-400">{texto}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={invitar} className="slab space-y-4 p-5 sm:p-6">
        <div>
          <label className="label" htmlFor="eq-email">Correo</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bone-600" />
            <input id="eq-email" type="email" className="field pl-12" placeholder="nombre@empresa.cl" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div>
          <p className="label">Cargo</p>
          <Segmento nombre="Cargo" opciones={OPCIONES.filter((o) => cargos.includes(o.value))} valor={perfil} onChange={setPerfil} />
        </div>
        <button className="btn-primary w-full" disabled={enviando || !email}>Enviar invitación</button>
      </form>
    </div>
  );
}
