import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HardHat, Mail, ShieldCheck, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useDatos } from '@/lib/datos';
import { ROL, fecha } from '@/lib/dominio';
import { Avatar, Chip, Encabezado, Segmento, Vacio, item, lista, useToast } from '@/components/ui';

const ROLES = [
  { value: 'user', label: 'Jefe de obra' },
  { value: 'admin', label: 'Jefe de personal' },
];

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
  const { usuario } = useDatos();
  const [usuarios, setUsuarios] = useState(null);
  const [cambiando, setCambiando] = useState(null);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('user');
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

  const invitar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const correo = email.trim().toLowerCase();
      await base44.users.inviteUser(correo, rol);
      // El jefe de obra invitado queda aprobado solo al crear su cuenta.
      if (rol === 'user') await base44.entities.Autorizado.create({ email: correo, invitado_por: usuario.email });
      avisar(rol === 'user' ? 'Invitación enviada. Tendrá acceso apenas cree su cuenta.' : 'Invitación enviada.');
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
        Cualquiera puede crear una cuenta, pero solo ve datos si lo invitaste como jefe de obra o si le das acceso aquí.
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
                  <p className="truncate text-xs text-bone-500">{u.email} · {ROL[u.role] ?? u.role} · desde {fecha(u.created_date)}</p>
                </div>
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
        <p className="mt-2 text-xs text-bone-600">Los jefes de personal siempre tienen acceso.</p>
      </section>

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-bone-400">Invitar</h2>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="slab p-5">
          <HardHat className="mb-3 h-5 w-5 text-obra" />
          <p className="font-bold">Jefe de obra</p>
          <p className="mt-1 text-sm text-bone-400">Solo evalúa a los trabajadores de sus obras cuando termina su contrato, y ve sus propias evaluaciones. No ve la base de personal ni el historial.</p>
        </div>
        <div className="slab p-5">
          <ShieldCheck className="mb-3 h-5 w-5 text-hivis" />
          <p className="font-bold">Jefe de personal</p>
          <p className="mt-1 text-sm text-bone-400">Acceso a todo: base de personal, historiales, alertas, obras, términos de contrato, importación y accesos.</p>
        </div>
      </div>

      <form onSubmit={invitar} className="slab space-y-4 p-5 sm:p-6">
        <div>
          <label className="label" htmlFor="eq-email">Correo</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-bone-600" />
            <input id="eq-email" type="email" className="field pl-12" placeholder="jefe.terreno@empresa.cl" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div>
          <p className="label">Rol</p>
          <Segmento nombre="Rol" opciones={ROLES} valor={rol} onChange={setRol} />
        </div>
        <button className="btn-primary w-full" disabled={enviando || !email}>Enviar invitación</button>
      </form>
    </div>
  );
}
