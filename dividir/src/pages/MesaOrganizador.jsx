import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Camera, Check, CheckCircle2, Copy, ExternalLink, Loader2, Lock, Plus, QrCode, Share2, Sparkles, Trash2, Users, Wallet, X,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import QR from '@/components/QR';
import { Avatar, Aviso, Cargando, colorDe } from '@/components/ui';
import { dividirConIA, leerBoleta } from '@/lib/ia';
import { calcularMesa, clp, errorTexto, linkMesa, nuevoId, totalItem } from '@/lib/util';

const PASOS = [
  { id: 'boleta', t: 'Boleta', i: Camera },
  { id: 'personas', t: 'Personas', i: Users },
  { id: 'dividir', t: 'Dividir', i: Sparkles },
  { id: 'cobrar', t: 'Cobrar', i: QrCode },
];

export default function MesaOrganizador() {
  const { id } = useParams();
  const [mesa, setMesa] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [paso, setPaso] = useState('boleta');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const pendiente = useRef(null);
  const timer = useRef(null);

  const cargar = useCallback(async () => {
    const [m, p] = await Promise.all([
      base44.entities.Mesa.get(id),
      base44.entities.Pago.filter({ mesa_id: id }),
    ]);
    if (!pendiente.current) setMesa(m);
    setPagos(p);
    return m;
  }, [id]);

  useEffect(() => {
    cargar()
      .then((m) => setPaso(m.estado !== 'armando' ? 'cobrar' : (m.items || []).length ? 'personas' : 'boleta'))
      .catch((e) => setError(errorTexto(e)));
  }, [cargar]);

  // Mientras se cobra, los invitados cambian la mesa (se suman, marcan lo suyo, pagan): refrescamos.
  useEffect(() => {
    if (mesa?.estado !== 'cobrando') return;
    const t = setInterval(() => cargar().catch(() => {}), 4000);
    // Respaldo del webhook: preguntar a Mercado Pago por los pendientes.
    const v = setInterval(() => base44.functions.invoke('verificar-pago', { codigo: mesa.codigo }).catch(() => {}), 15000);
    return () => { clearInterval(t); clearInterval(v); };
  }, [mesa?.estado, mesa?.codigo, cargar]);

  // Guardado con pequeña espera para no escribir en cada tecla.
  const guardar = (cambios, inmediato = false) => {
    setMesa((m) => ({ ...m, ...cambios }));
    pendiente.current = { ...(pendiente.current || {}), ...cambios };
    clearTimeout(timer.current);
    const ejecutar = async () => {
      const datos = pendiente.current;
      pendiente.current = null;
      if (!datos) return;
      setGuardando(true);
      try { await base44.entities.Mesa.update(id, datos); } catch (e) { setError(errorTexto(e)); }
      setGuardando(false);
    };
    if (inmediato) return ejecutar();
    timer.current = setTimeout(ejecutar, 700);
  };

  if (error && !mesa) return <div className="mx-auto max-w-md p-4"><Aviso>{error}</Aviso></div>;
  if (!mesa) return <Cargando />;

  const calc = calcularMesa(mesa);
  const bloqueada = mesa.estado !== 'armando';

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-4">
      <header className="flex items-center gap-2">
        <Link to="/" className="rounded-full p-2 hover:bg-stone-100" aria-label="Volver"><ArrowLeft className="h-5 w-5" /></Link>
        <input
          className="min-w-0 flex-1 bg-transparent font-display text-2xl font-extrabold outline-none placeholder:text-tinta-300"
          placeholder="Nombre del restorán"
          value={mesa.restoran || ''}
          onChange={(e) => guardar({ restoran: e.target.value })}
          disabled={bloqueada}
        />
        {guardando && <Loader2 className="h-4 w-4 animate-spin text-tinta-300" />}
      </header>

      <nav className="sticky top-0 z-10 -mx-4 mt-3 flex gap-1 bg-crema/90 px-4 py-2 backdrop-blur">
        {PASOS.map(({ id: p, t, i: I }) => (
          <button key={p} onClick={() => setPaso(p)} className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-semibold transition ${paso === p ? 'bg-hoja text-crema' : 'text-tinta-400 hover:bg-stone-100'}`}>
            <I className="h-4 w-4" />{t}
          </button>
        ))}
      </nav>

      <Aviso>{error && mesa ? error : ''}</Aviso>
      {bloqueada && paso !== 'cobrar' && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-aji-100 px-4 py-3 text-sm text-aji-600">
          <Lock className="h-4 w-4 shrink-0" /> El cobro está abierto. Para editar la boleta o las personas, ciérralo en «Cobrar».
        </div>
      )}

      <div className="entra mt-4" key={paso}>
        {paso === 'boleta' && <PasoBoleta mesa={mesa} guardar={guardar} bloqueada={bloqueada} calc={calc} siguiente={() => setPaso('personas')} />}
        {paso === 'personas' && <PasoPersonas mesa={mesa} guardar={guardar} bloqueada={bloqueada} siguiente={() => setPaso('dividir')} />}
        {paso === 'dividir' && <PasoDividir mesa={mesa} guardar={guardar} calc={calc} siguiente={() => setPaso('cobrar')} />}
        {paso === 'cobrar' && <PasoCobrar mesa={mesa} pagos={pagos} calc={calc} guardar={guardar} recargar={cargar} setError={setError} />}
      </div>

      {paso !== 'cobrar' && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
            <span className="text-sm text-tinta-400">Total con {mesa.propina_pct ?? 10}% propina</span>
            <b className="font-display text-2xl tabular-nums">{clp(calc.total)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 1. Boleta ---------------- */
function PasoBoleta({ mesa, guardar, bloqueada, calc, siguiente }) {
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);
  const items = mesa.items || [];

  const subir = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setError('');
    setLeyendo(true);
    try {
      const r = await leerBoleta(archivo);
      const nuevos = (r.items || [])
        .filter((it) => it.nombre && Number.isFinite(Number(it.precio_unitario)))
        .map((it) => ({ id: nuevoId(), nombre: it.nombre, cantidad: Math.max(1, Math.round(it.cantidad || 1)), precio_unitario: Math.round(it.precio_unitario), asignados: [] }));
      if (!nuevos.length) throw new Error('No pudimos leer ítems en la foto. Prueba con más luz o agrégalos a mano.');
      guardar({
        items: [...items, ...nuevos],
        boleta_url: r.boleta_url,
        ...(r.total_impreso ? { total_boleta: Math.round(r.total_impreso) } : {}),
        ...(!mesa.restoran && r.restoran ? { restoran: r.restoran } : {}),
        ...(r.propina_sugerida_pct ? { propina_pct: Math.round(r.propina_sugerida_pct) } : {}),
      }, true);
    } catch (err) {
      setError(errorTexto(err));
    }
    setLeyendo(false);
  };

  const cambiarItem = (itemId, cambios) => guardar({ items: items.map((it) => (it.id === itemId ? { ...it, ...cambios } : it)) });
  const cuadra = !mesa.total_boleta || Math.abs(mesa.total_boleta - calc.subtotal) < 2;

  return (
    <div className="space-y-4">
      {!bloqueada && (
        <>
          <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={subir} />
          <button onClick={() => input.current?.click()} disabled={leyendo} className="relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed border-hoja/30 bg-hoja-100/50 p-8 text-hoja active:scale-[.99]">
            {leyendo ? (
              <>
                <span className="escaner absolute inset-x-0 h-1 bg-aji/70 shadow-[0_0_20px_4px_rgba(249,115,22,.5)]" />
                <Sparkles className="h-8 w-8 animate-pulse" />
                <b>La IA está leyendo la boleta…</b>
              </>
            ) : (
              <>
                <Camera className="h-8 w-8" />
                <b>{items.length ? 'Agregar otra foto' : 'Sacar foto a la boleta'}</b>
                <span className="text-sm text-hoja/70">o elegirla de tu galería</span>
              </>
            )}
          </button>
        </>
      )}
      <Aviso>{error}</Aviso>

      {items.length > 0 && (
        <div className="boleta tarjeta !rounded-b-none">
          <div className="mb-2 flex items-center justify-between">
            <span className="etiqueta">Detalle ({items.length})</span>
            {mesa.boleta_url && <a href={mesa.boleta_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-hoja">Ver foto</a>}
          </div>
          <ul className="divide-y divide-dashed divide-stone-200">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-2 py-2">
                <input type="number" inputMode="numeric" min="1" className="w-10 rounded-lg bg-stone-50 px-1 py-1 text-center text-sm tabular-nums" value={it.cantidad} onChange={(e) => cambiarItem(it.id, { cantidad: Math.max(1, Number(e.target.value) || 1) })} disabled={bloqueada} aria-label="Cantidad" />
                <input className="min-w-0 flex-1 bg-transparent py-1 text-sm font-medium outline-none" value={it.nombre} onChange={(e) => cambiarItem(it.id, { nombre: e.target.value })} disabled={bloqueada} aria-label="Nombre" />
                <input type="number" inputMode="numeric" className="w-20 rounded-lg bg-stone-50 px-2 py-1 text-right text-sm tabular-nums" value={it.precio_unitario} onChange={(e) => cambiarItem(it.id, { precio_unitario: Math.round(Number(e.target.value) || 0) })} disabled={bloqueada} aria-label="Precio unitario" />
                {!bloqueada && <button onClick={() => guardar({ items: items.filter((x) => x.id !== it.id) })} className="p-1 text-tinta-300 hover:text-red-600" aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
          {!bloqueada && (
            <button onClick={() => guardar({ items: [...items, { id: nuevoId(), nombre: '', cantidad: 1, precio_unitario: 0, asignados: [] }] })} className="mt-2 flex items-center gap-1 text-sm font-semibold text-hoja">
              <Plus className="h-4 w-4" /> Agregar ítem
            </button>
          )}
          <div className="mt-4 space-y-1 border-t border-stone-200 pt-3 text-sm">
            <Fila t="Subtotal" v={clp(calc.subtotal)} />
            {mesa.total_boleta ? <Fila t="Total impreso en la boleta" v={clp(mesa.total_boleta)} alerta={!cuadra} /> : null}
            {!cuadra && <p className="text-xs text-aji-600">No cuadra con la boleta: revisa los precios leídos.</p>}
          </div>
        </div>
      )}

      {items.length > 0 && <button onClick={siguiente} className="btn-primario mt-6 w-full">Siguiente: ¿quiénes comieron?</button>}
    </div>
  );
}

function Fila({ t, v, alerta }) {
  return <div className={`flex justify-between ${alerta ? 'text-aji-600' : ''}`}><span className="text-tinta-500">{t}</span><b className="tabular-nums">{v}</b></div>;
}

/* ---------------- 2. Personas ---------------- */
function PasoPersonas({ mesa, guardar, bloqueada, siguiente }) {
  const [nombre, setNombre] = useState('');
  const personas = mesa.personas || [];

  const agregar = (e) => {
    e.preventDefault();
    const n = nombre.trim().slice(0, 30);
    if (!n) return;
    guardar({ personas: [...personas, { id: nuevoId(), nombre: n }] }, true);
    setNombre('');
  };
  const quitar = (pid) => guardar({
    personas: personas.filter((p) => p.id !== pid),
    items: (mesa.items || []).map((it) => ({ ...it, asignados: (it.asignados || []).filter((x) => x !== pid) })),
  }, true);

  return (
    <div className="space-y-4">
      <p className="text-tinta-500">Agrega a los que están en la mesa. También pueden sumarse solos escaneando el QR.</p>
      {!bloqueada && (
        <form onSubmit={agregar} className="flex gap-2">
          <input className="campo" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          <button className="btn-primario !px-4" aria-label="Agregar"><Plus className="h-5 w-5" /></button>
        </form>
      )}
      <ul className="space-y-2">
        {personas.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-100">
            <Avatar nombre={p.nombre} i={i} />
            <span className="flex-1 font-medium">{p.nombre}{p.id === mesa.organizador_persona_id && <span className="ml-2 text-xs text-tinta-400">(tú, organizas)</span>}</span>
            {!bloqueada && p.id !== mesa.organizador_persona_id && (
              <button onClick={() => quitar(p.id)} className="p-1 text-tinta-300 hover:text-red-600" aria-label={`Quitar a ${p.nombre}`}><X className="h-4 w-4" /></button>
            )}
          </li>
        ))}
      </ul>
      <button onClick={siguiente} className="btn-primario w-full">Siguiente: dividir</button>
    </div>
  );
}

/* ---------------- 3. Dividir ---------------- */
function PasoDividir({ mesa, guardar, calc, siguiente }) {
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [resumen, setResumen] = useState('');
  const [error, setError] = useState('');
  const personas = mesa.personas || [];
  const items = mesa.items || [];

  const alternar = (itemId, pid) => guardar({
    items: items.map((it) => {
      if (it.id !== itemId) return it;
      const s = new Set(it.asignados || []);
      s.has(pid) ? s.delete(pid) : s.add(pid);
      return { ...it, asignados: [...s] };
    }),
  });
  const todosEn = (itemId) => guardar({ items: items.map((it) => (it.id === itemId ? { ...it, asignados: personas.map((p) => p.id) } : it)) });

  const usarIA = async () => {
    if (!texto.trim()) return;
    setPensando(true);
    setError('');
    setResumen('');
    try {
      const r = await dividirConIA({ items, personas, instruccion: texto });
      const lista = [...personas];
      const idDe = (nombre) => {
        const n = String(nombre || '').trim();
        if (!n) return null;
        const yo = /^(yo|m[ií]o|organizador)$/i.test(n) ? lista.find((p) => p.id === mesa.organizador_persona_id) : null;
        const p = yo || lista.find((x) => x.nombre.toLowerCase() === n.toLowerCase());
        if (p) return p.id;
        const nueva = { id: nuevoId(), nombre: n.slice(0, 30) };
        lista.push(nueva);
        return nueva.id;
      };
      const mapa = Object.fromEntries((r.asignaciones || []).map((a) => [a.item_id, [...new Set(a.personas.map(idDe).filter(Boolean))]]));
      guardar({ modo: 'items', personas: lista, items: items.map((it) => (mapa[it.id] ? { ...it, asignados: mapa[it.id] } : it)) }, true);
      setResumen(r.resumen || 'Listo. Revisa y ajusta tocando los nombres.');
    } catch (e) {
      setError(errorTexto(e));
    }
    setPensando(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-stone-100 p-1">
        {[['items', 'Cada uno lo suyo'], ['igual', 'Parejo']].map(([m, t]) => (
          <button key={m} onClick={() => guardar({ modo: m }, true)} className={`rounded-xl py-2.5 text-sm font-semibold ${mesa.modo === m ? 'bg-white shadow' : 'text-tinta-400'}`}>{t}</button>
        ))}
      </div>

      {mesa.modo === 'items' && (
        <>
          <div className="tarjeta !p-4">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-aji" /> Cuéntale a la IA quién pidió qué</label>
            <textarea className="campo min-h-[84px] resize-none text-sm" placeholder="Ej: Ana y yo compartimos la pizza, Beto se tomó las 2 cervezas y el postre lo dividimos entre todos" value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button onClick={usarIA} disabled={pensando || !texto.trim()} className="btn-aji mt-2 w-full !py-3">
              {pensando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Dividir con IA
            </button>
            <Aviso>{error}</Aviso>
            {resumen && <p className="mt-2 text-sm text-hoja">✓ {resumen}</p>}
          </div>

          <ul className="space-y-3">
            {items.map((it) => {
              const sin = !(it.asignados || []).length;
              return (
                <li key={it.id} className={`rounded-2xl bg-white p-3 ring-1 ${sin ? 'ring-aji/40' : 'ring-stone-100'}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <b className="text-sm">{it.cantidad > 1 && `${it.cantidad}× `}{it.nombre || 'Ítem'}</b>
                    <span className="text-sm tabular-nums text-tinta-500">{clp(totalItem(it))}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {personas.map((p, i) => {
                      const on = (it.asignados || []).includes(p.id);
                      return (
                        <button key={p.id} onClick={() => alternar(it.id, p.id)} className={`chip ${on ? 'text-white ring-transparent' : 'bg-white text-tinta-500 ring-stone-200'}`} style={on ? { backgroundColor: colorDe(i) } : undefined}>
                          {on && <Check className="h-3.5 w-3.5" />}{p.nombre}
                        </button>
                      );
                    })}
                    <button onClick={() => todosEn(it.id)} className="chip bg-stone-50 text-tinta-400 ring-stone-200">Todos</button>
                  </div>
                </li>
              );
            })}
          </ul>
          {calc.sinAsignar > 0 && <Aviso>Quedan {clp(calc.sinAsignar)} sin asignar. Tus amigos también pueden marcar lo suyo desde el QR.</Aviso>}
        </>
      )}

      <div>
        <span className="etiqueta">Propina</span>
        <div className="mt-2 flex gap-2">
          {[0, 10, 15, 20].map((p) => (
            <button key={p} onClick={() => guardar({ propina_pct: p })} className={`chip flex-1 justify-center !py-2.5 ${Number(mesa.propina_pct ?? 10) === p ? 'bg-hoja text-crema ring-hoja' : 'bg-white ring-stone-200'}`}>{p}%</button>
          ))}
        </div>
      </div>

      <Resumen mesa={mesa} calc={calc} />
      <button onClick={siguiente} className="btn-primario w-full">Siguiente: cobrar</button>
    </div>
  );
}

function Resumen({ mesa, calc }) {
  return (
    <div className="tarjeta !p-4">
      <span className="etiqueta">Cuánto pone cada uno</span>
      <ul className="mt-2 divide-y divide-stone-100">
        {(mesa.personas || []).map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 py-2">
            <Avatar nombre={p.nombre} i={i} chico />
            <span className="flex-1 text-sm">{p.nombre}</span>
            <b className="tabular-nums">{clp(calc.porPersona[p.id]?.total)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- 4. Cobrar ---------------- */
function PasoCobrar({ mesa, pagos, calc, guardar, recargar, setError }) {
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const link = linkMesa(mesa.codigo);
  const personas = mesa.personas || [];
  const deudores = personas.filter((p) => p.id !== mesa.organizador_persona_id && (calc.porPersona[p.id]?.total || 0) > 0);
  const pagoDe = (pid) => pagos.find((p) => p.persona_id === pid && p.estado === 'pagado');
  const juntado = pagos.filter((p) => p.estado === 'pagado').reduce((a, p) => a + (p.monto || 0), 0);
  const listos = deudores.filter((p) => pagoDe(p.id)).length;
  const todos = deudores.length > 0 && listos === deudores.length;

  const compartir = async () => {
    const texto = `Paga tu parte de ${mesa.restoran || 'la cuenta'} aquí:`;
    if (navigator.share) return navigator.share({ title: 'Dividir la cuenta', text: texto, url: link }).catch(() => {});
    await navigator.clipboard?.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const efectivo = async (pid, deshacer) => {
    setOcupado(pid);
    try {
      await base44.functions.invoke('marcar-efectivo', { mesa_id: mesa.id, persona_id: pid, deshacer });
      await recargar();
    } catch (e) { setError(errorTexto(e)); }
    setOcupado('');
  };

  if (mesa.estado === 'armando') {
    return (
      <div className="space-y-4">
        <Resumen mesa={mesa} calc={calc} />
        {calc.sinAsignar > 0 && <Aviso>Hay {clp(calc.sinAsignar)} sin asignar. Puedes abrir el cobro igual: cada uno marca lo suyo al entrar.</Aviso>}
        <div className="rounded-2xl bg-hoja-100 p-4 text-sm text-hoja">
          Al abrir el cobro, cada uno escanea el QR, confirma lo que consumió y paga su parte con Mercado Pago.
          La plata llega a tu cuenta de Mercado Pago y con eso pagas el QR del restorán.
        </div>
        <button onClick={() => guardar({ estado: 'cobrando' }, true)} className="btn-aji w-full" disabled={!(mesa.items || []).length}>
          <QrCode className="h-5 w-5" /> Abrir cobro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {todos ? (
        <div className="entra rounded-3xl bg-hoja p-5 text-crema">
          <CheckCircle2 className="h-10 w-10 text-aji" />
          <h2 className="mt-2 font-display text-2xl font-extrabold">¡Todos pagaron!</h2>
          <p className="mt-1 text-crema/80">Juntaste <b className="text-white">{clp(juntado)}</b>. Tu parte es {clp(calc.porPersona[mesa.organizador_persona_id]?.total)}.</p>
          <ol className="mt-4 space-y-1.5 text-sm">
            <li>1. Abre la app de <b>Mercado Pago</b></li>
            <li>2. Toca <b>Pagar con QR</b> y escanea el QR del restorán</li>
            <li>3. Paga <b className="text-aji">{clp(calc.total)}</b></li>
          </ol>
          <a href="https://www.mercadopago.cl/" target="_blank" rel="noreferrer" className="btn mt-4 w-full bg-crema text-hoja"><Wallet className="h-5 w-5" /> Abrir Mercado Pago</a>
          <button onClick={() => guardar({ estado: 'cerrada' }, true)} className="mt-2 w-full py-2 text-sm text-crema/70">Ya pagué, cerrar mesa</button>
        </div>
      ) : (
        <div className="tarjeta text-center">
          <p className="etiqueta">Escaneen para pagar</p>
          <QR texto={link} className="mx-auto mt-3 w-56" />
          <p className="mt-2 font-mono text-lg font-bold tracking-[.3em] text-hoja">{mesa.codigo}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={compartir} className="btn-suave !py-2.5 text-sm"><Share2 className="h-4 w-4" /> Compartir</button>
            <button onClick={async () => { await navigator.clipboard?.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }} className="btn-suave !py-2.5 text-sm">
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copiado ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        </div>
      )}

      <div className="tarjeta !p-4">
        <div className="flex items-end justify-between">
          <div><span className="etiqueta">Juntado</span><p className="font-display text-3xl font-extrabold tabular-nums text-hoja">{clp(juntado)}</p></div>
          <span className="text-sm text-tinta-400">{listos}/{deudores.length} pagaron</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-hoja-500 transition-all duration-700" style={{ width: `${deudores.length ? (listos / deudores.length) * 100 : 0}%` }} />
        </div>
        <ul className="mt-3 divide-y divide-stone-100">
          {personas.map((p, i) => {
            const pago = pagoDe(p.id);
            const monto = calc.porPersona[p.id]?.total || 0;
            const org = p.id === mesa.organizador_persona_id;
            return (
              <li key={p.id} className="flex items-center gap-2 py-2.5">
                <Avatar nombre={p.nombre} i={i} chico />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.nombre}</span>
                  <span className="text-xs text-tinta-400">
                    {org ? 'Paga al restorán' : pago ? (pago.medio === 'efectivo' ? 'Efectivo / transferencia' : 'Mercado Pago') : monto ? 'Pendiente' : 'Sin consumo'}
                    {pago && pago.monto !== monto && !org ? ` · pagó ${clp(pago.monto)}` : ''}
                  </span>
                </span>
                <b className="text-sm tabular-nums">{clp(monto)}</b>
                {!org && monto > 0 && (pago ? (
                  pago.medio === 'efectivo'
                    ? <button onClick={() => efectivo(p.id, true)} className="chip bg-hoja-100 text-hoja ring-transparent" disabled={ocupado === p.id}><Check className="h-3.5 w-3.5" /> Listo</button>
                    : <span className="chip bg-hoja-100 text-hoja ring-transparent"><Check className="h-3.5 w-3.5" /> Pagó</span>
                ) : (
                  <button onClick={() => efectivo(p.id)} className="chip bg-white text-tinta-500 ring-stone-200" disabled={ocupado === p.id}>
                    {ocupado === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Efectivo'}
                  </button>
                ))}
              </li>
            );
          })}
        </ul>
      </div>

      {mesa.estado === 'cobrando' && (
        <button onClick={() => guardar({ estado: 'armando' }, true)} className="w-full py-2 text-sm text-tinta-400">
          Pausar cobro para editar la cuenta
        </button>
      )}
      {mesa.estado === 'cerrada' && (
        <button onClick={() => guardar({ estado: 'cobrando' }, true)} className="w-full py-2 text-sm text-tinta-400">
          <ExternalLink className="mr-1 inline h-4 w-4" /> Reabrir cobro
        </button>
      )}
    </div>
  );
}
