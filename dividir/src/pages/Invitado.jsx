import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Clock, Loader2, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Avatar, Aviso, Cargando, EncabezadoBoleta, Linea, Marca, Perforacion, Sello, Ticket } from '@/components/ui';
import { clp, errorTexto, totalItem } from '@/lib/util';

const clave = (codigo) => `dividir:${codigo}`;
const leerYo = (codigo) => { try { return localStorage.getItem(clave(codigo)); } catch { return null; } };
const guardarYo = (codigo, id) => { try { id ? localStorage.setItem(clave(codigo), id) : localStorage.removeItem(clave(codigo)); } catch { /* sin almacenamiento */ } };

export default function Invitado() {
  const { codigo: crudo } = useParams();
  const codigo = (crudo || '').toUpperCase();
  const [params, setParams] = useSearchParams();
  const [mesa, setMesa] = useState(null);
  const [yo, setYo] = useState(() => params.get('p') || leerYo(codigo));
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [marcados, setMarcados] = useState(null); // Set de item ids mientras edita
  const [ocupado, setOcupado] = useState(false);
  const [verificando, setVerificando] = useState(!!params.get('p'));

  const llamar = async (fn, datos) => (await base44.functions.invoke(fn, { codigo, ...datos })).data;

  const cargar = useCallback(async () => {
    try { setMesa(await llamar('mesa-publica')); } catch (e) { setError(errorTexto(e)); }
  }, [codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  // Vuelta desde Mercado Pago: confirmar el pago al tiro (no esperar el aviso).
  useEffect(() => {
    if (!params.get('p')) return;
    guardarYo(codigo, params.get('p'));
    llamar('verificar-pago', { persona_id: params.get('p') })
      .then((m) => m && setMesa(m))
      .catch(() => {})
      .finally(() => { setVerificando(false); setParams({}, { replace: true }); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => { if (marcados === null) cargar(); }, 8000);
    return () => clearInterval(t);
  }, [cargar, marcados]);

  const persona = mesa?.personas.find((p) => p.id === yo);
  const indice = mesa?.personas.findIndex((p) => p.id === yo) ?? 0;
  const esOrganizador = persona && persona.id === mesa.organizador_persona_id;
  const pagado = persona?.pago === 'pagado';
  const puedeEditar = mesa && mesa.modo === 'items' && mesa.estado !== 'cerrada' && !pagado;

  const misItems = useMemo(() => new Set((mesa?.items || []).filter((it) => it.asignados.includes(yo)).map((it) => it.id)), [mesa, yo]);
  const editando = marcados !== null;

  const unirme = async (e, personaId) => {
    e?.preventDefault();
    setError('');
    setOcupado(true);
    try {
      const r = await llamar('reclamar', personaId ? { persona_id: personaId } : { nombre });
      setYo(r.persona_id);
      guardarYo(codigo, r.persona_id);
      setMesa(r.mesa);
      if (r.mesa.modo === 'items' && !r.mesa.items.some((it) => it.asignados.includes(r.persona_id))) setMarcados(new Set());
    } catch (err) { setError(errorTexto(err)); }
    setOcupado(false);
  };

  const confirmarItems = async () => {
    setOcupado(true);
    setError('');
    try {
      const r = await llamar('reclamar', { persona_id: yo, item_ids: [...marcados] });
      setMesa(r.mesa);
      setMarcados(null);
    } catch (err) { setError(errorTexto(err)); }
    setOcupado(false);
  };

  const pagar = async () => {
    setOcupado(true);
    setError('');
    try {
      const r = await llamar('crear-pago', { persona_id: yo, origen: window.location.origin });
      window.location.href = r.link_pago;
    } catch (err) {
      setError(errorTexto(err));
      setOcupado(false);
      cargar();
    }
  };

  if (!mesa) return error ? <Pantalla><Aviso>{error}</Aviso></Pantalla> : <Cargando />;

  // ¿Quién eres?
  if (!persona) {
    return (
      <Pantalla mesa={mesa}>
        <Ticket className="!pb-6">
          <EncabezadoBoleta restoran={mesa.restoran} codigo={mesa.codigo} />
          <Perforacion />
          <h1 className="text-center text-2xl font-extrabold tracking-tight">¿Quién eres?</h1>
          <p className="mt-1 text-center text-sm text-tinta-500">Elige tu nombre o súmate a la mesa.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {mesa.personas.filter((p) => p.id !== mesa.organizador_persona_id).map((p) => (
              <button key={p.id} onClick={(e) => unirme(e, p.id)} disabled={ocupado} className="chip bg-papel !py-2 !pl-1.5 !pr-4 text-[15px] ring-linea">
                <Avatar nombre={p.nombre} i={mesa.personas.indexOf(p)} chico /> {p.nombre}
                {p.pago === 'pagado' && <Check className="h-4 w-4 text-verde" />}
              </button>
            ))}
          </div>
          <form onSubmit={unirme} className="mt-5 flex gap-2">
            <input className="campo" placeholder="Soy otra persona: mi nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} />
            <button className="btn-primario !px-4" disabled={ocupado || !nombre.trim()} aria-label="Sumarme">
              {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            </button>
          </form>
          <Aviso>{error}</Aviso>
        </Ticket>
      </Pantalla>
    );
  }

  const pagadosN = mesa.personas.filter((p) => p.pago === 'pagado').length;

  return (
    <Pantalla mesa={mesa}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar nombre={persona.nombre} i={indice} />
        <div className="flex-1 leading-tight">
          <p className="text-xs text-tinta-400">Tu cuenta</p>
          <b className="text-lg tracking-tight">{persona.nombre}</b>
        </div>
        {!pagado && <button className="text-sm text-tinta-400 underline underline-offset-4" onClick={() => { setYo(null); guardarYo(codigo, null); setMarcados(null); }}>No soy yo</button>}
      </div>

      {verificando && <div className="mb-4 flex items-center gap-2 rounded-xl bg-verde-100 p-4 text-sm text-verde"><Loader2 className="h-4 w-4 animate-spin" /> Confirmando tu pago con Mercado Pago…</div>}

      {esOrganizador && <p className="mb-4 rounded-xl bg-papel-claro p-4 text-sm text-tinta-500 ring-1 ring-linea">Tú organizas: pagas al restorán con lo que reúnan los demás.</p>}

      {editando ? (
        <section className="entra">
          <h1 className="text-2xl font-extrabold tracking-tight">¿Qué consumiste?</h1>
          <p className="mt-1 text-sm text-tinta-500">Si algo lo compartiste, márcalo igual: se divide entre quienes lo marquen.</p>
          <ul className="mt-4 overflow-hidden rounded-2xl bg-papel-claro ring-1 ring-linea">
            {mesa.items.map((it) => {
              const on = marcados.has(it.id);
              const otros = it.asignados.filter((x) => x !== yo).length;
              return (
                <li key={it.id} className="border-b border-linea last:border-0">
                  <button
                    onClick={() => setMarcados((s) => { const n = new Set(s); n.has(it.id) ? n.delete(it.id) : n.add(it.id); return n; })}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${on ? 'bg-verde-100/60' : ''}`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md transition ${on ? 'bg-tinta text-white' : 'ring-1 ring-tinta-300'}`}>{on && <Check className="h-3.5 w-3.5" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{it.cantidad > 1 && <span className="num text-tinta-400">{it.cantidad}× </span>}{it.nombre}</span>
                      {otros > 0 && <span className="text-xs text-tinta-400">{otros === 1 ? '1 persona más lo marcó' : `${otros} personas más lo marcaron`}</span>}
                    </span>
                    <span className="num text-sm">{clp(totalItem(it))}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Aviso>{error}</Aviso>
          <button onClick={confirmarItems} disabled={ocupado} className="btn-primario mt-4 w-full">
            {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Listo, eso es lo mío
          </button>
        </section>
      ) : (
        <div className="relative">
          <Ticket imprime>
            <EncabezadoBoleta restoran={mesa.restoran} codigo={mesa.codigo} />
            <div className="mt-4 flex justify-between border-b border-dashed border-linea pb-1.5"><span className="etiqueta">Detalle de {persona.nombre}</span>{puedeEditar && <button className="etiqueta !text-tinta underline" onClick={() => setMarcados(new Set(misItems))}>Editar</button>}</div>
            <div className="mt-1">
              {persona.detalle.map((d, i) => <Linea key={i} izq={d.nombre} sub={d.compartido ? 'Compartido' : null} der={d.monto} />)}
              {mesa.modo === 'igual' && <Linea izq={`Cuenta ÷ ${mesa.personas.length}`} der={Math.round(persona.monto / (1 + mesa.propina_pct / 100))} />}
              {mesa.modo === 'items' && !persona.detalle.length && <p className="py-3 text-center text-sm text-tinta-400">Aún no marcas nada.</p>}
              <Linea izq={`Propina ${mesa.propina_pct}%`} der={persona.monto - persona.detalle.reduce((a, d) => a + d.monto, 0) - (mesa.modo === 'igual' ? Math.round(persona.monto / (1 + mesa.propina_pct / 100)) : 0)} className="text-tinta-500" />
            </div>
            <Perforacion />
            <div className="flex items-end justify-between">
              <span className="etiqueta">{esOrganizador ? 'Tu parte' : pagado ? 'Pagaste' : 'Total a pagar'}</span>
              <span className="num text-[34px] font-bold leading-none">{clp(persona.monto)}</span>
            </div>
            <div className="codigo-barras mt-6" />
            <p className="etiqueta mt-2 text-center">{pagadosN} de {Math.max(0, mesa.personas.length - 1)} pagaron · mesa {clp(mesa.total)}</p>
          </Ticket>
          {pagado && <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center"><Sello className="bg-papel-claro/60 text-3xl" /></div>}
        </div>
      )}

      {!editando && !esOrganizador && (pagado ? (
        <p className="mt-6 text-center text-sm text-tinta-500">Listo, tu parte quedó pagada. Gracias 🙌</p>
      ) : (
        <>
          <Aviso>{error}</Aviso>
          {mesa.estado === 'cobrando' ? (
            <button onClick={pagar} disabled={ocupado || persona.monto < 50} className="btn mt-6 w-full bg-mp !py-4 text-white hover:bg-mp-600">
              {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
              Pagar {clp(persona.monto)} con Mercado Pago
            </button>
          ) : (
            <p className="mt-6 flex items-center gap-2 rounded-xl bg-papel-claro p-4 text-sm text-tinta-500 ring-1 ring-linea">
              {mesa.estado === 'cerrada' ? <Lock className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
              {mesa.estado === 'cerrada' ? 'Esta mesa ya está cerrada.' : 'El organizador está terminando de armar la cuenta. Puedes ir marcando lo tuyo.'}
            </p>
          )}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-tinta-400"><ShieldCheck className="h-3.5 w-3.5" /> Pago seguro procesado por Mercado Pago</p>
        </>
      ))}
    </Pantalla>
  );
}

function Pantalla({ mesa, children }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-5">
      <div className="mb-6 flex items-center justify-between">
        <Marca />
        {mesa && <span className="etiqueta">Mesa {mesa.codigo}</span>}
      </div>
      <div className="entra">{children}</div>
    </div>
  );
}
