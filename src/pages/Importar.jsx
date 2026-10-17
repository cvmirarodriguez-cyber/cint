import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, Loader2, Trash2, Upload, X } from 'lucide-react';
import readXlsxFile from 'read-excel-file/browser';
import { useDatos } from '@/lib/datos';
import { CARGOS, cargoDesdeTexto, cargoLabel, hoyISO, plano } from '@/lib/dominio';
import { formatearRut, limpiarRut, normalizarRut, rutValido } from '@/lib/rut';
import { TIPOS_CV, leerCurriculum, nuevoDocumento } from '@/lib/documentos';
import { Chip, Encabezado, ease, useToast } from '@/components/ui';

function separar(linea, sep) {
  // CSV simple con soporte de comillas.
  const out = [];
  let cur = '';
  let q = false;
  for (const ch of linea) {
    if (ch === '"') q = !q;
    else if (ch === sep && !q) { out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const textoAFilas = (texto) => {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (!lineas.length) return [];
  const sep = ['\t', ';', ','].find((s) => lineas[0].includes(s)) ?? ',';
  return lineas.map((l) => separar(l, sep));
};

// Convierte las filas de una hoja (Excel, CSV o pegado) en trabajadores, detectando las columnas.
function interpretar(filas, hoja = '') {
  const limpias = filas.map((f) => f.map((c) => (c == null ? '' : String(c).trim()))).filter((f) => f.some(Boolean));
  if (!limpias.length) return [];
  // La fila de encabezados puede no ser la primera (planillas con título arriba).
  let iEnc = limpias.slice(0, 8).findIndex((f) => f.some((h) => /rut|nombre|cargo|apellido/.test(plano(h))));
  const tieneEnc = iEnc >= 0;
  if (!tieneEnc) iEnc = -1;
  const enc = tieneEnc ? limpias[iEnc].map((h) => plano(h)) : [];
  const cuerpo = limpias.slice(iEnc + 1);
  const idx = (re) => enc.findIndex((h) => re.test(h));

  let iRut = tieneEnc ? idx(/rut|run/) : -1;
  let iNom = tieneEnc ? idx(/^nombre|nombres|trabajador/) : -1;
  const iApe = tieneEnc ? enc.map((h, i) => (/apellido/.test(h) ? i : -1)).filter((i) => i >= 0) : [];
  let iCar = tieneEnc ? idx(/cargo|puesto|funcion/) : -1;
  const iEsp = tieneEnc ? idx(/especialidad|oficio/) : -1;
  const iTel = tieneEnc ? idx(/telefono|celular|fono|movil/) : -1;
  const iObra = tieneEnc ? idx(/obra|proyecto|faena/) : -1;

  if (iRut < 0 && cuerpo[0]) iRut = cuerpo[0].findIndex((c) => rutValido(c));
  if (iNom < 0 && cuerpo[0]) iNom = cuerpo[0].findIndex((c, i) => i !== iRut && /[a-záéíóúñ]{2,}\s+[a-záéíóúñ]/i.test(c));
  if (iCar < 0 && cuerpo[0]) iCar = cuerpo[0].findIndex((c, i) => i !== iRut && i !== iNom && /maestro|jornal|capataz|supervisor/i.test(c));

  const col = (c, i) => (i >= 0 ? c[i] ?? '' : '');
  return cuerpo.map((c) => ({
    nombre: [c[iNom], ...iApe.map((i) => c[i])].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
    rut: col(c, iRut),
    cargoTexto: col(c, iCar),
    especialidad: col(c, iEsp),
    telefono: col(c, iTel),
    obraTexto: col(c, iObra),
    hoja,
  }));
}

// Busca una obra por nombre o código, sin importar tildes ni mayúsculas.
const buscarObra = (obras, texto) => {
  const t = plano(texto || '').trim();
  if (!t) return null;
  return obras.find((o) => plano(o.nombre) === t || plano(o.codigo || '') === t)
    ?? obras.find((o) => plano(o.nombre).includes(t) || t.includes(plano(o.nombre)))
    ?? null;
};

// Suma trabajadores a la cuadrilla de una obra, sin duplicar a quien ya está vigente ahí.
async function sumarAObra(E, contratos, obra, lista) {
  const yaEstan = new Set(contratos.filter((c) => c.obra_id === obra.id && c.estado === 'vigente').map((c) => c.trabajador_id));
  const nuevos = lista.filter((t) => t?.id && !yaEstan.has(t.id));
  if (!nuevos.length) return 0;
  await E.Contrato.bulkCreate(nuevos.map((t) => ({
    trabajador_id: t.id, trabajador_nombre: t.nombre, trabajador_rut: t.rut, cargo: t.cargo,
    obra_id: obra.id, obra_nombre: obra.nombre,
    jefe_terreno_email: obra.jefe_terreno_email || '', jefe_personal_email: obra.jefe_personal_email || '',
    fecha_inicio: hoyISO(), estado: 'vigente',
  })));
  return nuevos.length;
}

function SelectorObra({ obras, valor, onChange, id, ayuda }) {
  return (
    <div>
      <label className="label" htmlFor={id}>Sumar a la cuadrilla de</label>
      <select id={id} className="field" value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Ninguna obra (solo cargar a la base)</option>
        {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}{o.codigo ? ` (${o.codigo})` : ''}</option>)}
      </select>
      {ayuda && <p className="mt-1.5 text-xs text-bone-500">{ayuda}</p>}
    </div>
  );
}

function Barra({ valor }) {
  if (valor === null) return null;
  return (
    <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[.06]">
      <motion.div className="hazard h-full" animate={{ width: `${valor * 100}%` }} transition={{ ease }} />
    </div>
  );
}

const ESTADOS = { ok: ['Nuevo', 'ok'], existe: ['Ya existe', 'muted'], repetido: ['Repetido', 'warn'], rut_invalido: ['RUT inválido', 'bad'], sin_nombre: ['Sin nombre', 'bad'] };

function Planilla() {
  const { E, trabajadores, obras, contratos, recargar } = useDatos();
  const avisar = useToast();
  const [filasBrutas, setFilasBrutas] = useState([]);
  const [texto, setTexto] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [obraId, setObraId] = useState('');
  const [progreso, setProgreso] = useState(null);
  const archivo = useRef(null);

  const filas = useMemo(() => {
    const porRut = new Map(trabajadores.map((t) => [limpiarRut(t.rut), t]));
    const vistos = new Set();
    const elegida = obras.find((o) => o.id === obraId) ?? null;
    const base = nombreArchivo ? filasBrutas : interpretar(textoAFilas(texto));
    return base.map((f) => {
      const k = limpiarRut(f.rut);
      let estado = 'ok';
      if (!f.nombre) estado = 'sin_nombre';
      else if (!rutValido(f.rut)) estado = 'rut_invalido';
      else if (vistos.has(k)) estado = 'repetido';
      else if (porRut.has(k)) estado = 'existe';
      vistos.add(k);
      // Obra: la columna de la fila, si no el nombre de la hoja, si no la elegida arriba.
      const obra = buscarObra(obras, f.obraTexto) ?? buscarObra(obras, f.hoja) ?? elegida;
      return { ...f, cargo: cargoDesdeTexto(f.cargoTexto), estado, existente: porRut.get(k) ?? null, obra };
    });
  }, [filasBrutas, texto, nombreArchivo, trabajadores, obras, obraId]);

  const nuevas = filas.filter((f) => f.estado === 'ok');
  const aObra = filas.filter((f) => f.obra && (f.estado === 'ok' || f.estado === 'existe'));
  const cuenta = (e) => filas.filter((f) => f.estado === e).length;

  const leer = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      if (/\.xlsx$/i.test(f.name)) {
        const hojas = await readXlsxFile(f);
        setFilasBrutas(hojas.flatMap(({ sheet, data }) => interpretar(data, sheet)));
      } else {
        const buf = await f.arrayBuffer();
        // Excel en Chile suele exportar CSV en latin-1.
        let t = new TextDecoder('utf-8').decode(buf);
        if (t.includes('�')) t = new TextDecoder('windows-1252').decode(buf);
        setFilasBrutas(interpretar(textoAFilas(t)));
      }
      setNombreArchivo(f.name);
    } catch {
      avisar('No se pudo leer el archivo. Usa .xlsx o .csv.', 'bad');
    }
  };

  const limpiar = () => { setNombreArchivo(''); setFilasBrutas([]); setTexto(''); };

  const importar = async () => {
    setProgreso(0);
    try {
      const creados = [];
      for (let i = 0; i < nuevas.length; i += 200) {
        const lote = await E.Trabajador.bulkCreate(nuevas.slice(i, i + 200).map((f) => ({
          nombre: f.nombre, rut: normalizarRut(f.rut), cargo: f.cargo, especialidad: f.especialidad, telefono: f.telefono,
        })));
        creados.push(...lote);
        setProgreso(Math.min(0.7, ((i + 200) / Math.max(nuevas.length, 1)) * 0.7));
      }
      const porRut = new Map(creados.map((t) => [limpiarRut(t.rut), t]));
      // Agrupa por obra y suma la cuadrilla de cada una.
      const grupos = new Map();
      for (const f of aObra) {
        const t = f.existente ?? porRut.get(limpiarRut(f.rut));
        if (!t) continue;
        if (!grupos.has(f.obra.id)) grupos.set(f.obra.id, { obra: f.obra, lista: [] });
        grupos.get(f.obra.id).lista.push(t);
      }
      let sumados = 0;
      for (const { obra, lista } of grupos.values()) sumados += await sumarAObra(E, contratos, obra, lista);
      setProgreso(1);
      await recargar();
      avisar(`${creados.length} trabajadores nuevos${sumados ? ` · ${sumados} sumados a ${grupos.size} ${grupos.size === 1 ? 'obra' : 'obras'}` : ''}`);
      limpiar();
    } catch {
      await recargar();
      avisar('La importación se interrumpió. Revisa y vuelve a intentar: los ya cargados aparecerán como existentes.', 'bad');
    } finally {
      setProgreso(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="slab flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="label mb-0">Planilla de trabajadores</p>
          <button onClick={() => archivo.current?.click()} className="btn-ghost px-3 py-2 text-sm"><FileSpreadsheet className="h-4 w-4" /> Subir Excel o CSV</button>
          <input ref={archivo} type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={leer} />
        </div>
        {nombreArchivo ? (
          <div className="flex items-center gap-3 rounded-xl border border-obra/30 bg-obra/[.06] px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-obra" />
            <span className="min-w-0 flex-1 truncate font-semibold">{nombreArchivo}</span>
            <button onClick={limpiar} className="rounded-lg p-1.5 text-bone-500 hover:bg-white/5" aria-label="Quitar archivo"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <textarea
            aria-label="Pegar datos desde Excel"
            className="field blueprint min-h-[220px] flex-1 font-mono text-sm leading-relaxed"
            placeholder={'Pega aquí desde Excel, o sube el archivo:\n\nNombre\tRUT\tCargo\tObra\nJuan Pérez Soto\t12.345.678-5\tMaestro primera\tMetro Línea 7'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        )}
        <SelectorObra
          id="imp-obra" obras={obras} valor={obraId} onChange={setObraId}
          ayuda="Si la planilla tiene una columna Obra o Proyecto, o una hoja por obra con su nombre, se usa esa."
        />
        <p className="text-xs text-bone-500">Columnas que reconoce: nombre (o nombres + apellidos), RUT, cargo, especialidad, teléfono y obra. Los RUT que ya están en la base no se duplican, pero sí se suman a la obra.</p>
      </div>

      <div className="slab flex min-h-[420px] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[.06] p-4">
          <span className="mr-auto text-sm font-bold">{filas.length ? `${filas.length} filas detectadas` : 'Vista previa'}</span>
          {Object.entries(ESTADOS).map(([k, [l, t]]) => cuenta(k) > 0 && <Chip key={k} tono={t}>{cuenta(k)} {l.toLowerCase()}</Chip>)}
        </div>
        <div className="flex-1 overflow-auto">
          {filas.length ? (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-ink-700 text-xs text-bone-500">
                <tr><th className="px-4 py-2 font-semibold">Nombre</th><th className="px-2 py-2 font-semibold">RUT</th><th className="px-2 py-2 font-semibold">Cargo</th><th className="px-2 py-2 font-semibold">Obra</th><th className="px-4 py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-white/[.04]">
                {filas.slice(0, 300).map((f, i) => (
                  <tr key={i} className={f.estado === 'ok' || f.estado === 'existe' ? '' : 'opacity-60'}>
                    <td className="max-w-[160px] truncate px-4 py-2">{f.nombre || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono text-xs">{formatearRut(f.rut)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-bone-400">{cargoLabel(f.cargo)}</td>
                    <td className="max-w-[120px] truncate px-2 py-2 text-xs text-bone-400">{f.obra?.nombre || (f.obraTexto ? <span className="text-hivis">«{f.obraTexto}» no existe</span> : '—')}</td>
                    <td className="px-4 py-2 text-right"><Chip tono={ESTADOS[f.estado][1]}>{ESTADOS[f.estado][0]}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="grid h-full place-items-center p-8 text-center text-sm text-bone-500">
              <div><Upload className="mx-auto mb-3 h-8 w-8 text-bone-600" strokeWidth={1.5} />Sube un Excel o pega datos para ver cómo se interpretan.</div>
            </div>
          )}
        </div>
        <div className="border-t border-white/[.06] p-4">
          <Barra valor={progreso} />
          <button onClick={importar} className="btn-primary w-full" disabled={(!nuevas.length && !aObra.length) || progreso !== null}>
            Cargar {nuevas.length} nuevos{aObra.length ? ` · sumar ${aObra.length} a obra` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

const ESTADO_CV = {
  leyendo: ['Leyendo…', 'muted'],
  existe: ['Se adjunta a su ficha', 'ok'],
  nuevo: ['Trabajador nuevo', 'obra'],
  falta_rut: ['Falta un RUT válido', 'bad'],
  error: ['No se pudo subir', 'bad'],
};

function Curriculums() {
  const { E, usuario, trabajadores, obras, contratos, recargar } = useDatos();
  const avisar = useToast();
  const [items, setItems] = useState([]);
  const [obraId, setObraId] = useState('');
  const [progreso, setProgreso] = useState(null);
  const archivo = useRef(null);

  const porRut = useMemo(() => new Map(trabajadores.map((t) => [limpiarRut(t.rut), t])), [trabajadores]);
  const porNombre = useMemo(() => new Map(trabajadores.map((t) => [plano(t.nombre), t])), [trabajadores]);

  // Une el currículum con un trabajador existente por RUT, o por nombre exacto si no trae RUT.
  const evaluar = (it) => {
    if (it.estado === 'leyendo' || it.estado === 'error') return it;
    const existente = (rutValido(it.rut) && porRut.get(limpiarRut(it.rut))) || (!it.rut && porNombre.get(plano(it.nombre))) || null;
    const estado = existente ? 'existe' : rutValido(it.rut) && it.nombre ? 'nuevo' : 'falta_rut';
    return { ...it, existente, estado };
  };
  const vista = items.map(evaluar);

  const cambiar = (id, campo, valor) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, [campo]: campo === 'rut' ? formatearRut(valor) : valor } : x)));

  const elegir = async (e) => {
    const archivos = [...(e.target.files || [])];
    e.target.value = '';
    if (!archivos.length) return;
    const nuevos = archivos.map((f) => ({ id: `${f.name}-${f.size}-${Math.random()}`, archivo: f, nombreArchivo: f.name, estado: 'leyendo', nombre: '', rut: '', cargo: 'jornal', especialidad: '', telefono: '', experiencia: '' }));
    setItems((xs) => [...xs, ...nuevos]);
    // De a 3 a la vez para no saturar la lectura con IA.
    const cola = [...nuevos];
    const trabajar = async () => {
      while (cola.length) {
        const it = cola.shift();
        try {
          const { uri, datos, leido } = await leerCurriculum(it.archivo);
          const rutArchivo = (it.nombreArchivo.match(/\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]/) || [])[0] || '';
          const rut = rutValido(datos.rut) ? datos.rut : rutValido(rutArchivo) ? rutArchivo : datos.rut || '';
          setItems((xs) => xs.map((x) => (x.id === it.id ? {
            ...x, uri, estado: 'listo', leido,
            nombre: (datos.nombre || '').trim(), rut: formatearRut(rut),
            cargo: cargoDesdeTexto(datos.cargo || ''), especialidad: datos.especialidad || '',
            telefono: datos.telefono || '', experiencia: (datos.experiencia || '').slice(0, 2000),
          } : x)));
        } catch {
          setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, estado: 'error' } : x)));
        }
      }
    };
    await Promise.all([trabajar(), trabajar(), trabajar()]);
  };

  const listos = vista.filter((x) => x.estado === 'existe' || x.estado === 'nuevo');
  const leyendo = vista.some((x) => x.estado === 'leyendo');

  const guardar = async () => {
    setProgreso(0);
    const obra = obras.find((o) => o.id === obraId) ?? null;
    const afectados = [];
    try {
      for (let i = 0; i < listos.length; i++) {
        const it = listos[i];
        const doc = nuevoDocumento(it.nombreArchivo, it.uri, 'cv', usuario);
        if (it.existente) {
          const t = it.existente;
          const cambios = { documentos: [...(t.documentos || []), doc] };
          if (it.experiencia && !t.experiencia) cambios.experiencia = it.experiencia;
          if (it.especialidad && !t.especialidad) cambios.especialidad = it.especialidad;
          if (it.telefono && !t.telefono) cambios.telefono = it.telefono;
          afectados.push(await E.Trabajador.update(t.id, cambios));
        } else {
          afectados.push(await E.Trabajador.create({
            nombre: it.nombre, rut: normalizarRut(it.rut), cargo: it.cargo, especialidad: it.especialidad,
            telefono: it.telefono, experiencia: it.experiencia, documentos: [doc],
          }));
        }
        setProgreso((i + 1) / listos.length);
      }
      const sumados = obra ? await sumarAObra(E, contratos, obra, afectados) : 0;
      await recargar();
      avisar(`${listos.length} currículums guardados${sumados ? ` · ${sumados} sumados a ${obra.nombre}` : ''}`);
      setItems((xs) => xs.filter((x) => !listos.some((l) => l.id === x.id)));
    } catch {
      await recargar();
      avisar('Se guardó una parte. Revisa la lista y vuelve a intentar.', 'bad');
    } finally {
      setProgreso(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="slab flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="label">Currículums</p>
          <p className="text-sm text-bone-400">Sube varios a la vez (PDF, Word o fotos). La app lee cada uno, saca nombre, RUT, oficio y experiencia, y lo guarda en la ficha del trabajador. Los archivos quedan privados.</p>
        </div>
        <button onClick={() => archivo.current?.click()} className="btn-primary shrink-0"><FileText className="h-4 w-4" /> Elegir archivos</button>
        <input ref={archivo} type="file" multiple accept={TIPOS_CV} className="hidden" onChange={elegir} />
      </div>

      {vista.length > 0 && (
        <div className="slab overflow-hidden">
          <ul className="divide-y divide-white/[.05]">
            {vista.map((it) => (
              <li key={it.id} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-xs text-bone-500"><FileText className="h-3.5 w-3.5 shrink-0" />{it.nombreArchivo}</p>
                  {it.estado === 'leyendo' ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-bone-400"><Loader2 className="h-4 w-4 animate-spin" /> Leyendo el documento…</p>
                  ) : (
                    <input aria-label="Nombre" className="field mt-2 py-2" value={it.nombre} onChange={(e) => cambiar(it.id, 'nombre', e.target.value)} placeholder="Nombre completo" />
                  )}
                </div>
                {it.estado !== 'leyendo' && it.estado !== 'error' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input aria-label="RUT" className="field py-2 font-mono text-sm" value={it.rut} onChange={(e) => cambiar(it.id, 'rut', e.target.value)} placeholder="RUT" />
                    <select aria-label="Cargo" className="field py-2 text-sm" value={it.cargo} onChange={(e) => cambiar(it.id, 'cargo', e.target.value)}>
                      {CARGOS.map((c) => <option key={c.value} value={c.value}>{c.corto}</option>)}
                    </select>
                    {it.experiencia && <p className="col-span-2 line-clamp-2 text-xs text-bone-500">{it.experiencia}</p>}
                    {it.leido === false && <p className="col-span-2 text-xs text-hivis">No se pudo leer automáticamente: completa nombre y RUT.</p>}
                  </div>
                ) : <span />}
                <div className="flex items-center gap-2 md:justify-end">
                  <Chip tono={ESTADO_CV[it.estado][1]}>{it.estado === 'existe' ? `Se adjunta a ${it.existente.nombre.split(' ')[0]}` : ESTADO_CV[it.estado][0]}</Chip>
                  <button onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))} className="rounded-lg p-1.5 text-bone-500 hover:bg-white/5" aria-label="Quitar"><X className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 gap-4 border-t border-white/[.06] p-4 md:grid-cols-[1fr_auto] md:items-end">
            <SelectorObra id="cv-obra" obras={obras} valor={obraId} onChange={setObraId} />
            <div>
              <Barra valor={progreso} />
              <button onClick={guardar} className="btn-primary w-full md:w-auto" disabled={!listos.length || leyendo || progreso !== null}>
                Guardar {listos.length} {listos.length === 1 ? 'currículum' : 'currículums'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Importar() {
  const { E, trabajadores, obras, contratos, evaluaciones, recargar } = useDatos();
  const avisar = useToast();
  const [pestana, setPestana] = useState('planilla');

  const demo = [
    ...evaluaciones.filter((x) => x.demo).map((x) => ['Evaluacion', x.id]),
    ...contratos.filter((x) => x.demo).map((x) => ['Contrato', x.id]),
    ...obras.filter((x) => x.demo).map((x) => ['Obra', x.id]),
    ...trabajadores.filter((x) => x.demo).map((x) => ['Trabajador', x.id]),
  ];
  const [borrando, setBorrando] = useState(false);
  const borrarDemo = async () => {
    if (!window.confirm(`¿Borrar los ${demo.length} registros de demostración? Los datos reales no se tocan.`)) return;
    setBorrando(true);
    try {
      for (let i = 0; i < demo.length; i += 25) {
        await Promise.all(demo.slice(i, i + 25).map(([ent, id]) => E[ent].delete(id)));
      }
      await recargar();
      avisar('Datos de demo borrados');
    } catch {
      await recargar();
      avisar('No se pudo borrar todo; vuelve a intentar', 'bad');
    } finally {
      setBorrando(false);
    }
  };

  const PESTANAS = [['planilla', 'Planilla Excel', FileSpreadsheet], ['cv', 'Currículums', FileText]];

  return (
    <div>
      <Encabezado eyebrow="Carga masiva" titulo="Importar">
        Carga la base de personal desde Excel, súmala a la cuadrilla de cada obra y guarda los currículums en la ficha de cada trabajador.
      </Encabezado>

      {demo.length > 0 && (
        <div className="slab mb-6 flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center">
          <div className="hazard absolute inset-y-0 left-0 w-2" />
          <div className="flex-1 pl-2">
            <p className="font-bold">Hay datos de demostración cargados</p>
            <p className="text-sm text-bone-400">{demo.length} registros ficticios para mostrar la app. Bórralos antes de cargar la base real.</p>
          </div>
          <button onClick={borrarDemo} disabled={borrando} className="btn-ghost border-alerta/40 text-alerta hover:bg-alerta/10"><Trash2 className="h-4 w-4" /> Borrar demo</button>
        </div>
      )}

      <div role="tablist" className="mb-6 inline-flex rounded-xl border border-white/10 bg-ink-800 p-1">
        {PESTANAS.map(([k, l, Icono]) => (
          <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${pestana === k ? 'text-ink' : 'text-bone-400 hover:text-bone'}`}>
            {pestana === k && <motion.span layoutId="pestana-importar" className="absolute inset-0 rounded-lg bg-bone" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <Icono className="relative h-4 w-4" /><span className="relative">{l}</span>
          </button>
        ))}
      </div>

      {pestana === 'planilla' ? <Planilla /> : <Curriculums />}
    </div>
  );
}
