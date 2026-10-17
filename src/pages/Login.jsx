import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Marca } from '@/components/Shell';
import { ease } from '@/components/ui';
import { BotonSoporte } from '@/components/SoporteChat';

const Obra3D = lazy(() => import('@/components/Obra3D'));

const CINTA = ['Supervisores', 'Capataces', 'Maestros primera', 'Maestros segunda', 'Jornales', 'Enfierradores', 'Carpinteros', 'Albañiles'];

// Fondo compartido por login y "acceso pendiente".
export function Escenario({ children }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="blueprint absolute inset-0 opacity-60" />
      <Suspense fallback={null}>
        <Obra3D className="absolute inset-0 lg:left-[-12%]" />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-ink/30 lg:to-ink" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-7xl flex-col px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-end">
        <Marca className="lg:absolute lg:left-8 lg:top-6" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.3 }}
          className="mt-auto w-full min-w-0 lg:mt-0 lg:max-w-[440px] lg:flex-none"
        >
          {children}
        </motion.div>
      </div>

      {/* Cinta inferior en movimiento */}
      <div className="absolute inset-x-0 bottom-0 z-0 hidden overflow-hidden border-t border-white/5 bg-ink/60 py-2 backdrop-blur lg:block">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-mono text-xs uppercase tracking-[.2em] text-bone-600">
          {[...CINTA, ...CINTA, ...CINTA, ...CINTA].map((t, i) => (
            <span key={i} className="flex items-center gap-10">{t}<span className="text-obra">◆</span></span>
          ))}
        </div>
      </div>
    </div>
  );
}

const TITULOS = { entrar: 'Ingresar', registro: 'Activar invitación', codigo: 'Verifica tu correo' };

export default function Login() {
  const [modo, setModo] = useState('entrar');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (m) => { setModo(m); setError(''); };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    const correo = email.trim();
    try {
      if (modo === 'registro') {
        await base44.auth.register({ email: correo, password: clave });
        setModo('codigo');
        setEnviando(false);
        return;
      }
      if (modo === 'codigo') await base44.auth.verifyOtp({ email: correo, otpCode: codigo.trim() });
      await base44.auth.loginViaEmailPassword(correo, clave);
      window.location.reload();
    } catch (err) {
      const msg = err?.data?.message || err?.message || '';
      if (modo === 'registro') setError(/exist/i.test(msg) ? 'Ese correo ya tiene cuenta. Ingresa con él.' : /password/i.test(msg) ? 'La contraseña debe tener al menos 8 caracteres.' : 'No se pudo crear la cuenta.');
      else if (modo === 'codigo') setError('Código incorrecto o vencido.');
      else setError(err?.status === 403 ? 'Tu correo aún no está verificado.' : 'Correo o contraseña incorrectos.');
      setEnviando(false);
    }
  };

  return (
    <Escenario>
      <p className="eyebrow mb-4 text-obra-300">Historial de personal de terreno</p>
      <h1 className="display text-[44px] sm:text-6xl">
        La memoria
        <br />
        de cada <span className="text-obra">obra</span>.
      </h1>
      <p className="mt-5 max-w-sm text-bone-400">
        Cada trabajador llega con su historial. Cada término de contrato deja una evaluación.
      </p>

      <div className="slab mt-8 p-5 sm:p-6">
        {modo !== 'codigo' && (
          <>
            <button
              type="button"
              onClick={() => base44.auth.loginWithProvider('google', window.location.href)}
              className="btn w-full bg-bone text-ink hover:bg-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
              </svg>
              Continuar con Google
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-bone-600">
              <span className="h-px flex-1 bg-white/10" /> o con tu correo <span className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}

        <form onSubmit={enviar} className="space-y-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={modo} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2, ease }} className="space-y-3">
              {modo === 'codigo' ? (
                <>
                  <p className="text-sm text-bone-300">Usa el mismo correo de tu invitación. Te enviamos un código a <b className="break-all text-bone">{email}</b>. Escríbelo para activar tu cuenta.</p>
                  <input className="field text-center font-mono text-2xl tracking-[.4em]" inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" value={codigo} onChange={(e) => setCodigo(e.target.value)} required autoFocus aria-label="Código de verificación" />
                </>
              ) : (
                <>
                  <input className="field" type="email" autoComplete="email" placeholder="correo@empresa.cl" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Correo" />
                  <input className="field" type="password" autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} placeholder={modo === 'registro' ? 'Contraseña (mín. 8 caracteres)' : 'Contraseña'} minLength={modo === 'registro' ? 8 : undefined} value={clave} onChange={(e) => setClave(e.target.value)} required aria-label="Contraseña" />
                </>
              )}
            </motion.div>
          </AnimatePresence>
          {error && <p className="text-sm font-semibold text-alerta">{error}</p>}
          <button className="btn-primary w-full" disabled={enviando}>
            {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{TITULOS[modo]} <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-bone-500">
          {modo === 'entrar' ? (
            <>¿Te invitaron por correo? <button type="button" onClick={() => cambiar('registro')} className="font-semibold text-obra-300 hover:underline">Activa tu acceso</button></>
          ) : (
            <button type="button" onClick={() => cambiar('entrar')} className="font-semibold text-obra-300 hover:underline">Ya tengo cuenta</button>
          )}
        </p>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-bone-600">
          <Lock className="h-3.5 w-3.5" /> Uso interno · acceso solo por invitación
        </p>
        <div className="mt-4 border-t border-white/[.06] pt-4 text-center text-sm text-bone-500">
          ¿Problemas para entrar? <BotonSoporte />
        </div>
      </div>
    </Escenario>
  );
}
