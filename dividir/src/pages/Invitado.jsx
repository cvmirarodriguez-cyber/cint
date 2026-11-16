import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Clock, Loader2, Lock, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Avatar, Aviso, Cargando, Marca } from '@/components/ui';
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
        <h1 className="font-display text-3xl font-extrabold">¿Quién eres?</h1>
        <p className="mt-1 text-tinta-500">Elige tu nombre o súmate a la mesa.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {mesa.personas.filter((p) => p.id !== mesa.organizador_persona_id).map((p) => (
            <button key={p.id} onClick={(e) => unirme(e, p.id)} disabled={ocupado} className="chip bg-white !py-2.5 !pl-1.5 !pr-4 text-base ring-stone-200">
              <Avatar nombre={p.nombre} i={mesa.personas.indexOf(p)} chico /> {p.nombre}
              {p.pago === 'pagado' && <Check className="h-4 w-4 text-hoja-500" />}
            </button>
          ))}
        </div>
        <form onSubmit={unirme} className="mt-6 flex gap-2">
          <input className="campo" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={30} />
          <button className="btn-primario !px-4" disabled={ocupado || !nombre.trim()} aria-label="Sumarme">
            {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
          </button>
        </form>
        <Aviso>{error}</Aviso>
      </Pantalla>
    );
  }

  return (
    <Pantalla mesa={mesa}>
      <div className="flex items-center gap-3">
        <Avatar nombre={persona.nombre} i={indice} />
        <div className="flex-1">
          <p className="text-sm text-tinta-400">Hola,</p>
          <b className="font-display text-xl">{persona.nombre}</b>
        </div>
        {!pagado && <button className="text-sm text-tinta-400" onClick={() => { setYo(null); guardarYo(codigo, null); setMarcados(null); }}>No soy yo</button>}
      </div>

      {verificando && <div className="mt-4 flex items-center gap-2 rounded-2xl bg-hoja-100 p-4 text-hoja"><Loader2 className="h-5 w-5 animate-spin" /> Confirmando tu pago…</div>}

      {pagado ? (
        <div className="entra mt-6 rounded-3xl bg-hoja p-6 text-center text-crema">
          <CheckCircle2 className="mx-auto h-14 w-14 text-aji" />
          <h1 className="mt-3 font-display text-3xl font-extrabold">¡Pagaste!</h1>
          <p className="mt-1 text-crema/80">Tu parte de {mesa.restoran} quedó lista. Gracias 🙌</p>
        </div>
      ) : esOrganizador ? (
        <p className="mt-6 rounded-2xl bg-hoja-100 p-4 text-hoja">Tú organizas: pagas al restorán con lo que junten los demás.</p>
      ) : null}

      {mesa.modo === 'items' && !pagado && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="etiqueta">{editando ? 'Toca lo que consumiste' : 'Lo tuyo'}</span>
            {puedeEditar && !editando && <button className="text-sm font-semibold text-hoja" onClick={() => setMarcados(new Set(misItems))}>Editar</button>}
          </div>
          <ul className="space-y-2">
            {mesa.items.filter((it) => editando || misItems.has(it.id)).map((it) => {
              const on = editando ? marcados.has(it.id) : true;
              const otros = it.asignados.filter((x) => x !== yo).length;
              return (
                <li key={it.id}>
                  <button
                    disabled={!editando}
                    onClick={() => setMarcados((s) => { const n = new Set(s); n.has(it.id) ? n.delete(it.id) : n.add(it.id); return n; })}
                    className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${on && editando ? 'bg-hoja-100 ring-hoja/30' : 'bg-white ring-stone-100'}`}
                  >
                    {editando && <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${on ? 'bg-hoja text-white' : 'ring-1 ring-stone-300'}`}>{on && <Check className="h-4 w-4" />}</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{it.cantidad > 1 && `${it.cantidad}× `}{it.nombre}</span>
                      {otros > 0 && <span className="text-xs text-tinta-400">compartido con {otros} más</span>}
                    </span>
                    <span className="text-sm tabular-nums text-tinta-500">{clp(totalItem(it))}</span>
                  </button>
                </li>
              );
            })}
            {!editando && misItems.size === 0 && <li className="rounded-2xl border-2 border-dashed border-stone-200 p-5 text-center text-sm text-tinta-400">Aún no marcas nada.</li>}
          </ul>
          {editando && (
            <button onClick={confirmarItems} disabled={ocupado} className="btn-primario mt-3 w-full">
              {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Listo, eso es lo mío
            </button>
          )}
        </section>
      )}

      {!pagado && !esOrganizador && !editando && (
        <section className="boleta tarjeta mt-6 !rounded-b-none">
          {persona.detalle.map((d, i) => (
            <div key={i} className="flex justify-between py-0.5 text-sm"><span className="text-tinta-500">{d.nombre}{d.compartido ? ' (parte)' : ''}</span><span className="tabular-nums">{clp(d.monto)}</span></div>
          ))}
          {mesa.modo === 'igual' && <p className="text-sm text-tinta-500">La cuenta se divide parejo entre {mesa.personas.length}.</p>}
          <div className="mt-2 flex items-end justify-between border-t border-dashed border-stone-200 pt-3">
            <span className="text-sm text-tinta-400">Tu parte con {mesa.propina_pct}% propina</span>
            <b className="font-display text-3xl font-extrabold tabular-nums">{clp(persona.monto)}</b>
          </div>
        </section>
      )}

      <Aviso>{error}</Aviso>

      {!pagado && !esOrganizador && !editando && (
        mesa.estado === 'cobrando' ? (
          <button onClick={pagar} disabled={ocupado || persona.monto < 50} className="btn mt-8 w-full bg-[#009ee3] text-white hover:bg-[#0089c6]">
            {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            Pagar {clp(persona.monto)} con Mercado Pago
          </button>
        ) : (
          <p className="mt-8 flex items-center gap-2 rounded-2xl bg-stone-100 p-4 text-sm text-tinta-500">
            {mesa.estado === 'cerrada' ? <Lock className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {mesa.estado === 'cerrada' ? 'Esta mesa ya está cerrada.' : 'El organizador está terminando de armar la cuenta. Puedes ir marcando lo tuyo.'}
          </p>
        )
      )}

      <p className="mt-6 text-center text-xs text-tinta-300">
        {mesa.personas.filter((p) => p.pago === 'pagado').length} de {mesa.personas.length - 1} ya pagaron · Total mesa {clp(mesa.total)}
      </p>
    </Pantalla>
  );
}

function Pantalla({ mesa, children }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 py-5">
      <div className="mb-6 flex items-center justify-between">
        <Marca />
        {mesa && <span className="truncate pl-3 text-sm font-semibold text-tinta-500">{mesa.restoran}</span>}
      </div>
      <div className="entra">{children}</div>
    </div>
  );
}
