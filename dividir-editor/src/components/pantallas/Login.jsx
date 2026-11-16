import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TemaToggle from '@/components/TemaToggle';
import { Avatar, Aviso, EncabezadoBoleta, Linea, Marca, Perforacion, Sello, Ticket } from '@/components/dividir';
import { safeReturnTo } from '@/lib/authReturnTo';


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
      window.location.href = safeReturnTo(window.location.search);
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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <div className="flex items-center justify-between"><Marca /><TemaToggle /></div>
      <h1 className="mt-10 text-[40px] font-extrabold leading-[1] tracking-[-0.045em]">
        Divide la cuenta.<br /><span className="text-tinta-400">Cobra con un QR.</span>
      </h1>
      <p className="mt-4 text-[15px] text-tinta-500">Foto a la boleta, la IA reparte cada plato y cada uno paga su parte con Mercado Pago.</p>

      <div className="relative mt-8 px-6">
        <Ticket className="!pb-5 !pt-6" imprime>
          <EncabezadoBoleta restoran="La Picá del Puerto" codigo="7K2QF" />
          <div className="mt-4">
            {[['Ana', 'Pizza (½), Coca-Cola', 19412], ['Beto', '2 Pisco sour', 16323], ['Cami', 'Lomo a lo pobre', 21162]].map(([n, d, m], i) => (
              <div key={n} className="flex items-center gap-2 py-1">
                <Avatar nombre={n} i={i + 1} chico />
                <Linea izq={n} sub={d} der={m} className="flex-1 !py-0" />
              </div>
            ))}
          </div>
          <Perforacion />
          <div className="flex items-end justify-between">
            <span className="etiqueta">Total c/ propina</span>
            <span className="num text-2xl font-bold">$80.267</span>
          </div>
        </Ticket>
        <Sello className="absolute -right-1 top-24 bg-papel-claro/40 text-[13px]" />
      </div>

      <div className="mt-8 rounded-2xl bg-papel-claro p-5 ring-1 ring-linea">
        <p className="mb-4 text-sm text-tinta-500">Solo quien organiza necesita cuenta. Tus amigos entran escaneando el QR.</p>
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
            <div className="my-4 flex items-center gap-3 text-xs text-tinta-400">
              <span className="h-px flex-1 bg-linea" /> o con tu correo <span className="h-px flex-1 bg-linea" />
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
        <button type="button" className="mt-4 w-full text-center text-sm font-medium text-tinta underline underline-offset-4" onClick={() => { setError(''); setModo(modo === 'entrar' ? 'registro' : 'entrar'); }}>
          {modo === 'entrar' ? '¿No tienes cuenta? Créala' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  );
}
