import { useState } from 'react';
import { ArrowRight, Camera, Loader2, QrCode, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Aviso, Marca } from '@/components/ui';
import { safeReturnTo } from '@/lib/authReturnTo';

const PASOS = [
  { icono: Camera, t: 'Foto a la boleta', d: 'La IA lee cada plato y su precio.' },
  { icono: Users, t: 'Cada uno marca lo suyo', d: 'O le dices a la IA quién pidió qué.' },
  { icono: QrCode, t: 'Pagan por QR', d: 'Mercado Pago. Tú pagas al restorán con lo juntado.' },
];

export default function Login() {
  const [modo, setModo] = useState('entrar'); // entrar | registro | codigo
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

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
      window.location.href = safeReturnTo();
    } catch (err) {
      const msg = err?.data?.message || err?.message || '';
      if (modo === 'registro')
        setError(/exist/i.test(msg) ? 'Ese correo ya tiene cuenta. Ingresa con él.' : /password/i.test(msg) ? 'La contraseña debe tener al menos 8 caracteres.' : 'No se pudo crear la cuenta.');
      else if (modo === 'codigo') setError('Código incorrecto o vencido.');
      else setError(err?.status === 403 ? 'Tu correo aún no está verificado.' : 'Correo o contraseña incorrectos.');
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <Marca />
      <h1 className="mt-10 font-display text-[42px] font-extrabold leading-[1.02] tracking-tight">
        La cuenta,<br /><span className="text-aji">dividida</span> en<br />un minuto.
      </h1>
      <ol className="mt-6 space-y-3">
        {PASOS.map(({ icono: I, t, d }, i) => (
          <li key={t} className="entra flex items-start gap-3" style={{ animationDelay: `${i * 80}ms` }}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-hoja-100 text-hoja"><I className="h-5 w-5" /></span>
            <span><b className="block">{t}</b><span className="text-sm text-tinta-500">{d}</span></span>
          </li>
        ))}
      </ol>

      <div className="tarjeta mt-8">
        <p className="mb-4 text-sm text-tinta-500">Solo quien organiza necesita cuenta. Tus amigos entran con el QR.</p>
        {modo !== 'codigo' && (
          <>
            <button type="button" onClick={() => base44.auth.loginWithProvider('google', window.location.href)} className="btn-suave w-full">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z" />
              </svg>
              Continuar con Google
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-tinta-300">
              <span className="h-px flex-1 bg-stone-200" /> o con tu correo <span className="h-px flex-1 bg-stone-200" />
            </div>
          </>
        )}
        <form onSubmit={enviar} className="space-y-3">
          {modo === 'codigo' ? (
            <>
              <p className="text-sm text-tinta-500">Te enviamos un código a <b className="break-all text-tinta">{email}</b>.</p>
              <input className="campo text-center font-mono text-2xl tracking-[.4em]" inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" value={codigo} onChange={(e) => setCodigo(e.target.value)} required autoFocus aria-label="Código de verificación" />
            </>
          ) : (
            <>
              <input className="campo" type="email" autoComplete="email" placeholder="tu@correo.cl" value={email} onChange={(e) => setEmail(e.target.value)} required aria-label="Correo" />
              <input className="campo" type="password" autoComplete={modo === 'registro' ? 'new-password' : 'current-password'} placeholder={modo === 'registro' ? 'Contraseña (mín. 8 caracteres)' : 'Contraseña'} minLength={modo === 'registro' ? 8 : undefined} value={clave} onChange={(e) => setClave(e.target.value)} required aria-label="Contraseña" />
            </>
          )}
          <Aviso>{error}</Aviso>
          <button className="btn-primario w-full" disabled={enviando}>
            {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            {modo === 'entrar' ? 'Entrar' : modo === 'registro' ? 'Crear cuenta' : 'Verificar'}
          </button>
        </form>
        <button type="button" className="mt-4 w-full text-center text-sm font-medium text-hoja" onClick={() => { setError(''); setModo(modo === 'entrar' ? 'registro' : 'entrar'); }}>
          {modo === 'entrar' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  );
}
