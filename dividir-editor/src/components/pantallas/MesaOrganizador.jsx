import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { invocar } from '@/lib/api';
import {
  ArrowLeft, ArrowRight, Banknote, Camera, Check, Copy, Image as ImageIcon, Loader2, Lock, Pause, Plus, QrCode, RotateCcw, Share2, Sparkles, Trash2, Wallet, X,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import QR from '@/components/QR';
import { Avatar, Aviso, Cargando, colorDe, EncabezadoBoleta, Linea, Perforacion, Sello, Ticket } from '@/components/dividir';
import { dividirConIA, leerBoleta } from '@/lib/ia';
import { calcularMesa, clp, errorTexto, linkMesa, nuevoId, totalItem } from '@/lib/util';

const PASOS = [
  { id: 'boleta', t: 'Boleta' },
  { id: 'personas', t: 'Personas' },
  { id: 'dividir', t: 'Dividir' },
  { id: 'cobrar', t: 'Cobrar' },
];

export default function MesaOrganizador({ id }) {
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
    const v = setInterval(() => invocar('verificar-pago', { codigo: mesa.codigo }).catch(() => {}), 15000);
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

  if (error && !mesa) return <div className="mx-auto max-w-md p-5"><Aviso>{error}</Aviso></div>;
  if (!mesa) return <Cargando />;

  const calc = calcularMesa(mesa);
  const bloqueada = mesa.estado !== 'armando';
  const actual = PASOS.findIndex((p) => p.id === paso);

  return (
    <div className="mx-auto max-w-md px-5 pb-36 pt-4">
      <header className="flex items-center gap-1">
        <Link to="/" className="-ml-2 rounded-full p-2 hover:bg-papel-oscuro" aria-label="Volver"><ArrowLeft className="h-5 w-5" /></Link>
        <input
          className="min-w-0 flex-1 bg-transparent text-[22px] font-extrabold tracking-[-0.035em] outline-none placeholder:text-tinta-300"
          placeholder="Nombre del restorán"
          value={mesa.restoran || ''}
          onChange={(e) => guardar({ restoran: e.target.value })}
          disabled={bloqueada}
        />
        {guardando ? <Loader2 className="h-4 w-4 animate-spin text-tinta-300" /> : <span className="etiqueta">{mesa.codigo}</span>}
      </header>

      {/* Progreso */}
      <nav className="sticky top-0 z-10 -mx-5 mt-2 bg-papel/90 px-5 pb-3 pt-2 backdrop-blur">
        <div className="flex gap-1.5">
          {PASOS.map(({ id: p, t }, i) => (
            <button key={p} onClick={() => setPaso(p)} className="group flex-1 text-left">
              <span className={`block h-1 rounded-full transition-colors ${i <= actual ? 'bg-tinta' : 'bg-linea'}`} />
              <span className={`mt-1.5 flex items-center gap-1 text-[12px] font-semibold ${i === actual ? 'text-tinta' : 'text-tinta-400'}`}>
                <span className="num text-[10px] opacity-60">0{i + 1}</span> {t}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <Aviso>{error && mesa ? error : ''}</Aviso>
      {bloqueada && paso !== 'cobrar' && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-ambar-100 px-4 py-3 text-sm text-ambar">
          <Lock className="h-4 w-4 shrink-0" /> El cobro está abierto. Para editar, pausa el cobro en «Cobrar».
        </div>
      )}

      <div className="entra mt-4" key={paso}>
        {paso === 'boleta' && <PasoBoleta mesa={mesa} guardar={guardar} bloqueada={bloqueada} calc={calc} />}
        {paso === 'personas' && <PasoPersonas mesa={mesa} guardar={guardar} bloqueada={bloqueada} />}
        {paso === 'dividir' && <PasoDividir mesa={mesa} guardar={guardar} calc={calc} bloqueada={bloqueada} />}
        {paso === 'cobrar' && <PasoCobrar mesa={mesa} pagos={pagos} calc={calc} guardar={guardar} recargar={cargar} setError={setError} />}
      </div>

      {paso !== 'cobrar' && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-papel-claro/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-3">
            <div className="flex-1">
              <span className="etiqueta">Total · {mesa.propina_pct ?? 10}% propina</span>
              <b className="num block text-[22px] leading-tight">{clp(calc.total)}</b>
            </div>
            <button
              onClick={() => setPaso(PASOS[actual + 1].id)}
              disabled={paso === 'boleta' && !(mesa.items || []).length}
              className="btn-primario !px-5"
            >
              {['Personas', 'Dividir', 'Cobrar'][actual]} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 1. Boleta ---------------- */
function PasoBoleta({ mesa, guardar, bloqueada, calc }) {
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState('');
  const camara = useRef(null);
  const galeria = useRef(null);
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
    <div className="space-y-5">
      <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={subir} />
      <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={subir} />

      {!bloqueada && (leyendo ? (
        <div className="relative overflow-hidden rounded-2xl bg-bloque p-8 text-center text-bloque-texto">
          <span className="escaner absolute inset-x-6 h-0.5 bg-verde shadow-[0_0_24px_6px_rgba(11,110,79,.7)]" />
          <Sparkles className="mx-auto h-7 w-7 animate-pulse" />
          <p className="mt-3 font-semibold">Leyendo la boleta…</p>
          <p className="mt-1 text-sm text-bloque-texto/60">La IA está identificando cada plato y su precio</p>
        </div>
      ) : (
        <div className={items.length ? 'grid grid-cols-2 gap-2' : ''}>
          <button onClick={() => camara.current?.click()} className={`flex w-full flex-col items-center gap-2 rounded-2xl bg-bloque text-bloque-texto ring-1 ring-white/5 active:scale-[.99] ${items.length ? 'p-4' : 'p-8'}`}>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><Camera className="h-6 w-6" /></span>
            <b>{items.length ? 'Otra foto' : 'Escanear boleta'}</b>
            {!items.length && <span className="text-sm text-bloque-texto/60">Saca una foto y la IA la lee por ti</span>}
          </button>
          {!items.length ? (
            <button onClick={() => galeria.current?.click()} className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-tinta-500">
              <ImageIcon className="h-4 w-4" /> Elegir de la galería
            </button>
          ) : (
            <button onClick={() => guardar({ items: [...items, { id: nuevoId(), nombre: '', cantidad: 1, precio_unitario: 0, asignados: [] }] })} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-papel-claro p-4 ring-1 ring-linea">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-papel-oscuro"><Plus className="h-6 w-6" /></span>
              <b>Ítem a mano</b>
            </button>
          )}
        </div>
      ))}
      <Aviso>{error}</Aviso>

      {items.length > 0 ? (
        <Ticket imprime key={items.length}>
          <EncabezadoBoleta restoran={mesa.restoran} codigo={mesa.codigo} fecha={mesa.created_date} />
          <div className="mt-4 flex justify-between border-b border-dashed border-linea pb-1.5"><span className="etiqueta">Cant · Detalle</span><span className="etiqueta">Precio</span></div>
          <ul>
            {items.map((it) => (
              <li key={it.id} className="group flex items-center gap-1.5 border-b border-dashed border-linea/70 py-1.5">
                <input type="number" inputMode="numeric" min="1" className="num w-8 bg-transparent text-center text-sm outline-none" value={it.cantidad} onChange={(e) => cambiarItem(it.id, { cantidad: Math.max(1, Number(e.target.value) || 1) })} disabled={bloqueada} aria-label="Cantidad" />
                <input className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-tinta-300" placeholder="Nombre del ítem" value={it.nombre} onChange={(e) => cambiarItem(it.id, { nombre: e.target.value })} disabled={bloqueada} aria-label="Nombre" />
                <span className="num text-xs text-tinta-400">$</span>
                <input type="number" inputMode="numeric" className="num w-[70px] bg-transparent text-right text-sm outline-none" value={it.precio_unitario * (it.cantidad || 1)} onChange={(e) => cambiarItem(it.id, { precio_unitario: Math.round((Number(e.target.value) || 0) / (it.cantidad || 1)) })} disabled={bloqueada} aria-label="Precio total del ítem" />
                {!bloqueada && <button onClick={() => guardar({ items: items.filter((x) => x.id !== it.id) })} className="p-1 text-tinta-300 hover:text-red-500" aria-label="Quitar"><Trash2 className="h-3.5 w-3.5" /></button>}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Linea izq="Subtotal" der={calc.subtotal} />
            <Linea izq={`Propina sugerida ${mesa.propina_pct ?? 10}%`} der={calc.propina} />
            {mesa.total_boleta ? <Linea izq="Subtotal impreso" der={mesa.total_boleta} className={cuadra ? '' : 'text-ambar'} /> : null}
          </div>
          <Perforacion />
          <div className="flex items-end justify-between">
            <span className="etiqueta">Total a pagar</span>
            <span className="num text-[26px] font-bold leading-none">{clp(calc.total)}</span>
          </div>
          {!cuadra && <p className="mt-3 rounded-lg bg-ambar-100 px-3 py-2 text-xs text-ambar">No cuadra con lo impreso: revisa los precios leídos.</p>}
          {cuadra && mesa.total_boleta ? <p className="mt-3 flex items-center gap-1.5 text-xs text-verde"><Check className="h-3.5 w-3.5" /> Cuadra con la boleta</p> : null}
          <div className="codigo-barras mt-5" />
          {mesa.boleta_url && <a href={mesa.boleta_url} target="_blank" rel="noreferrer" className="etiqueta mt-2 block text-center underline">Ver foto original</a>}
        </Ticket>
      ) : !leyendo && (
        <p className="text-center text-sm text-tinta-400">Funciona con boletas, comandas y pre-cuentas.</p>
      )}
    </div>
  );
}

/* ---------------- 2. Personas ---------------- */
function PasoPersonas({ mesa, guardar, bloqueada }) {
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
      <div>
        <h2 className="text-xl font-bold tracking-tight">¿Quiénes están en la mesa?</h2>
        <p className="mt-1 text-sm text-tinta-500">También pueden sumarse solos al escanear el QR.</p>
      </div>
      {!bloqueada && (
        <form onSubmit={agregar} className="flex gap-2">
          <input className="campo" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus maxLength={30} />
          <button className="btn-primario !px-4" aria-label="Agregar"><Plus className="h-5 w-5" /></button>
        </form>
      )}
      <ul className="overflow-hidden rounded-2xl bg-papel-claro ring-1 ring-linea">
        {personas.map((p, i) => (
          <li key={p.id} className="flex items-center gap-3 border-b border-linea px-4 py-3 last:border-0">
            <Avatar nombre={p.nombre} i={i} />
            <span className="flex-1 font-medium">{p.nombre}</span>
            {p.id === mesa.organizador_persona_id ? <span className="etiqueta">Organizas</span> : !bloqueada && (
              <button onClick={() => quitar(p.id)} className="p-1 text-tinta-300 hover:text-red-500" aria-label={`Quitar a ${p.nombre}`}><X className="h-4 w-4" /></button>
            )}
          </li>
        ))}
      </ul>
      <p className="etiqueta text-center">{personas.length} {personas.length === 1 ? 'persona' : 'personas'}</p>
    </div>
  );
}

/* ---------------- 3. Dividir ---------------- */
function PasoDividir({ mesa, guardar, calc, bloqueada }) {
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
      const r = await dividirConIA({ items, personas, instruccion: texto, organizador: personas.find((p) => p.id === mesa.organizador_persona_id)?.nombre });
      const lista = [...personas];
      const idDe = (nombre) => {
        const n = String(nombre || '').trim();
        if (!n) return null;
        const yo = /^(yo|m[ií]o|organizador)$/i.test(n) ? lista.find((p) => p.id === mesa.organizador_persona_id) : null;
        const p = yo || lista.find((x) => x.nombre.toLowerCase() === n.toLowerCase());
        if (p) return p.id;
        if (bloqueada) return null;
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
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-papel-oscuro p-1">
        {[['items', 'Cada uno lo suyo'], ['igual', 'Partes iguales']].map(([m, t]) => (
          <button key={m} onClick={() => guardar({ modo: m }, true)} className={`rounded-lg py-2.5 text-sm font-semibold transition ${mesa.modo === m ? 'bg-papel-claro shadow-sm' : 'text-tinta-400'}`}>{t}</button>
        ))}
      </div>

      {mesa.modo === 'items' && (
        <>
          <div className="rounded-2xl bg-bloque p-4 text-bloque-texto ring-1 ring-white/5">
            <label htmlFor="ia" className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-[#5ee0a8]" /> Cuéntale a la IA quién pidió qué</label>
            <textarea id="ia" className="mt-3 min-h-[92px] w-full resize-none rounded-xl bg-white/10 px-3.5 py-3 text-sm text-bloque-texto outline-none placeholder:text-bloque-texto/40 focus:bg-white/15" placeholder="Ej: Ana y yo compartimos la pizza, Beto se tomó los 2 piscos y el postre lo dividimos entre todos" value={texto} onChange={(e) => setTexto(e.target.value)} />
            <button onClick={usarIA} disabled={pensando || !texto.trim()} className="btn mt-2 w-full bg-bloque-texto !py-3 text-bloque">
              {pensando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {pensando ? 'Repartiendo…' : 'Dividir con IA'}
            </button>
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            {resumen && <p className="mt-3 flex gap-2 text-sm text-[#5ee0a8]"><Check className="mt-0.5 h-4 w-4 shrink-0" />{resumen}</p>}
          </div>

          <div>
            <p className="etiqueta mb-2">O toca los nombres en cada ítem</p>
            <ul className="overflow-hidden rounded-2xl bg-papel-claro ring-1 ring-linea">
              {items.map((it) => {
                const sin = !(it.asignados || []).length;
                return (
                  <li key={it.id} className="border-b border-linea px-4 py-3 last:border-0">
                    <div className="flex items-baseline gap-2">
                      {sin && <span className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full bg-ambar" title="Sin asignar" />}
                      <b className="flex-1 text-sm font-semibold">{it.cantidad > 1 && <span className="num font-normal text-tinta-400">{it.cantidad}× </span>}{it.nombre || 'Ítem'}</b>
                      <span className="num text-sm">{clp(totalItem(it))}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {personas.map((p, i) => {
                        const on = (it.asignados || []).includes(p.id);
                        return (
                          <button key={p.id} onClick={() => alternar(it.id, p.id)} className={`chip ${on ? 'text-white ring-transparent' : 'bg-transparent text-tinta-500 ring-linea'}`} style={on ? { backgroundColor: colorDe(i) } : undefined}>
                            {on && <Check className="h-3 w-3" />}{p.nombre}
                          </button>
                        );
                      })}
                      <button onClick={() => todosEn(it.id)} className="chip bg-papel-oscuro text-tinta-500 ring-transparent">Todos</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {calc.sinAsignar > 0 && <Aviso tipo="ambar">Quedan {clp(calc.sinAsignar)} sin asignar. Tus amigos también pueden marcar lo suyo desde el QR.</Aviso>}
        </>
      )}

      <div>
        <span className="etiqueta">Propina</span>
        <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-papel-oscuro p-1">
          {[0, 10, 15, 20].map((p) => (
            <button key={p} onClick={() => guardar({ propina_pct: p })} className={`num rounded-lg py-2 text-sm font-medium transition ${Number(mesa.propina_pct ?? 10) === p ? 'bg-papel-claro shadow-sm' : 'text-tinta-400'}`}>{p}%</button>
          ))}
        </div>
      </div>

      <Resumen mesa={mesa} calc={calc} />
    </div>
  );
}

function Resumen({ mesa, calc }) {
  return (
    <Ticket>
      <p className="etiqueta text-center">Cuánto pone cada uno</p>
      <div className="mt-3">
        {(mesa.personas || []).map((p, i) => {
          const d = calc.porPersona[p.id];
          return (
            <div key={p.id} className="flex items-center gap-2.5 py-1.5">
              <Avatar nombre={p.nombre} i={i} chico />
              <Linea izq={p.nombre} der={d?.total || 0} sub={d?.items?.length ? d.items.map((x) => x.nombre + (x.compartido ? ' (compartido)' : '')).join(', ') : mesa.modo === 'igual' ? 'Partes iguales' : 'Sin ítems'} className="min-w-0 flex-1 !py-0" />
            </div>
          );
        })}
      </div>
      <Perforacion />
      <Linea izq={calc.sinAsignar ? 'Asignado' : 'Total'} der={Object.values(calc.porPersona).reduce((a, x) => a + x.total, 0)} fuerte />
    </Ticket>
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
  const porJuntar = deudores.reduce((a, p) => a + (calc.porPersona[p.id]?.total || 0), 0);
  const listos = deudores.filter((p) => pagoDe(p.id)).length;
  const todos = deudores.length > 0 && listos === deudores.length;

  const copiar = async () => {
    await navigator.clipboard?.writeText(link).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };
  const compartir = async () => {
    if (navigator.share) return navigator.share({ title: 'Dividir la cuenta', text: `Paga tu parte de ${mesa.restoran || 'la cuenta'}:`, url: link }).catch(() => {});
    copiar();
  };

  const efectivo = async (pid, deshacer) => {
    setOcupado(pid);
    try {
      await invocar('marcar-efectivo', { mesa_id: mesa.id, persona_id: pid, deshacer });
      await recargar();
    } catch (e) { setError(errorTexto(e)); }
    setOcupado('');
  };

  if (mesa.estado === 'armando') {
    return (
      <div className="space-y-5">
        <Resumen mesa={mesa} calc={calc} />
        {calc.sinAsignar > 0 && <Aviso tipo="ambar">Hay {clp(calc.sinAsignar)} sin asignar. Puedes abrir el cobro igual: cada uno marca lo suyo al entrar.</Aviso>}
        <ol className="space-y-3 rounded-2xl bg-papel-claro p-4 text-sm ring-1 ring-linea">
          {['Tus amigos escanean el QR y confirman lo que consumieron.', 'Cada uno paga su parte con Mercado Pago.', 'Con lo reunido, pagas el QR del restorán.'].map((t, i) => (
            <li key={t} className="flex gap-3"><span className="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-tinta text-[11px] text-papel-claro">{i + 1}</span><span className="pt-0.5 text-tinta-500">{t}</span></li>
          ))}
        </ol>
        <button onClick={() => guardar({ estado: 'cobrando' }, true)} className="btn-primario w-full" disabled={!(mesa.items || []).length}>
          <QrCode className="h-5 w-5" /> Abrir cobro
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {todos || mesa.estado === 'cerrada' ? (
        <Ticket imprime className="text-center">
          <EncabezadoBoleta restoran={mesa.restoran} codigo={mesa.codigo} fecha={mesa.created_date} />
          <div className="my-6"><Sello texto={mesa.estado === 'cerrada' ? 'CERRADA' : 'REUNIDO'} className="text-2xl" /></div>
          <p className="etiqueta">Recaudado</p>
          <p className="num mt-1 text-[40px] font-bold leading-none">{clp(juntado)}</p>
          <p className="mt-2 text-sm text-tinta-500">+ tu parte {clp(calc.porPersona[mesa.organizador_persona_id]?.total)}</p>
          <Perforacion />
          {mesa.estado !== 'cerrada' && (
            <div className="text-left">
              <p className="etiqueta mb-2">Paga al restorán</p>
              <ol className="space-y-1.5 text-sm text-tinta-700">
                <li><span className="num text-tinta-400">01</span> Abre la app de Mercado Pago</li>
                <li><span className="num text-tinta-400">02</span> Toca «Pagar con QR» y escanea el del restorán</li>
                <li><span className="num text-tinta-400">03</span> Paga <b className="num">{clp(calc.total)}</b></li>
              </ol>
              <a href="https://www.mercadopago.cl/" target="_blank" rel="noreferrer" className="btn mt-4 w-full bg-mp text-white hover:bg-mp-600"><Wallet className="h-5 w-5" /> Abrir Mercado Pago</a>
              <button onClick={() => guardar({ estado: 'cerrada' }, true)} className="mt-2 w-full py-2 text-sm font-medium text-tinta-500">Ya pagué, cerrar mesa</button>
            </div>
          )}
        </Ticket>
      ) : (
        <Ticket className="text-center">
          <EncabezadoBoleta restoran={mesa.restoran} codigo={mesa.codigo} fecha={mesa.created_date} />
          <QR texto={link} className="mx-auto mt-5 w-52" />
          <p className="mt-3 text-sm text-tinta-500">Escaneen con la cámara para pagar su parte</p>
          <Perforacion />
          <div className="flex items-center justify-between">
            <span className="etiqueta">Código</span>
            <span className="num text-xl font-bold tracking-[.25em]">{mesa.codigo}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={compartir} className="btn-primario !py-2.5 text-sm"><Share2 className="h-4 w-4" /> Compartir</button>
            <button onClick={copiar} className="btn-suave !py-2.5 text-sm">{copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copiado ? 'Copiado' : 'Copiar link'}</button>
          </div>
        </Ticket>
      )}

      <div className="rounded-2xl bg-papel-claro p-4 ring-1 ring-linea">
        <div className="flex items-end justify-between">
          <div>
            <span className="etiqueta">Reunido</span>
            <p className="num text-[28px] font-bold leading-tight">{clp(juntado)}<span className="text-base font-normal text-tinta-300"> / {clp(porJuntar)}</span></p>
          </div>
          <span className="num rounded-full bg-papel-oscuro px-2.5 py-1 text-xs">{listos}/{deudores.length}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-papel-oscuro">
          <div className="h-full rounded-full bg-verde transition-all duration-700" style={{ width: `${porJuntar ? Math.min(100, (juntado / porJuntar) * 100) : 0}%` }} />
        </div>
        <ul className="mt-3">
          {personas.map((p, i) => {
            const pago = pagoDe(p.id);
            const monto = calc.porPersona[p.id]?.total || 0;
            const org = p.id === mesa.organizador_persona_id;
            return (
              <li key={p.id} className="flex items-center gap-2.5 border-t border-linea py-3">
                <Avatar nombre={p.nombre} i={i} chico />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.nombre}</span>
                  <span className="text-xs text-tinta-400">
                    {org ? 'Paga al restorán' : pago ? (pago.medio === 'efectivo' ? 'Efectivo / transferencia' : 'Mercado Pago') : monto ? 'Pendiente' : 'Sin consumo'}
                    {pago && pago.monto !== monto && !org ? ` · pagó ${clp(pago.monto)}` : ''}
                  </span>
                </span>
                <b className={`num text-sm ${pago ? 'text-tinta-300 line-through' : ''}`}>{clp(monto)}</b>
                {!org && monto > 0 && (pago ? (
                  pago.medio === 'efectivo'
                    ? <button onClick={() => efectivo(p.id, true)} className="chip bg-verde-100 text-verde ring-transparent" disabled={ocupado === p.id} title="Deshacer"><Check className="h-3.5 w-3.5" /> Pagó</button>
                    : <span className="chip bg-verde-100 text-verde ring-transparent"><Check className="h-3.5 w-3.5" /> Pagó</span>
                ) : (
                  <button onClick={() => efectivo(p.id)} className="chip text-tinta-500 ring-linea" disabled={ocupado === p.id} title="Marcar como pagado en efectivo">
                    {ocupado === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />} Efectivo
                  </button>
                ))}
              </li>
            );
          })}
        </ul>
      </div>

      {mesa.estado === 'cobrando' && (
        <button onClick={() => guardar({ estado: 'armando' }, true)} className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-tinta-400">
          <Pause className="h-4 w-4" /> Pausar cobro para editar la cuenta
        </button>
      )}
      {mesa.estado === 'cerrada' && (
        <button onClick={() => guardar({ estado: 'cobrando' }, true)} className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-tinta-400">
          <RotateCcw className="h-4 w-4" /> Reabrir cobro
        </button>
      )}
    </div>
  );
}
