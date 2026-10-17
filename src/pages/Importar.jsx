import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { useDatos } from '@/lib/datos';
import { cargoDesdeTexto, cargoLabel, plano } from '@/lib/dominio';
import { formatearRut, limpiarRut, normalizarRut, rutValido } from '@/lib/rut';
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

// Convierte texto pegado desde Excel o un CSV en filas {nombre, rut, cargo}.
function interpretar(texto) {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (!lineas.length) return [];
  const sep = ['\t', ';', ','].find((s) => lineas[0].includes(s)) ?? ',';
  const filas = lineas.map((l) => separar(l, sep));
  const enc = filas[0].map((h) => plano(h));
  const tieneEnc = enc.some((h) => /rut|nombre|cargo|apellido/.test(h));
  const cuerpo = tieneEnc ? filas.slice(1) : filas;
  const idx = (re) => enc.findIndex((h) => re.test(h));

  let iRut = tieneEnc ? idx(/rut|run/) : -1;
  let iNom = tieneEnc ? idx(/^nombre|nombres|trabajador/) : -1;
  const iApe = tieneEnc ? enc.map((h, i) => (/apellido/.test(h) ? i : -1)).filter((i) => i >= 0) : [];
  let iCar = tieneEnc ? idx(/cargo|puesto|funcion/) : -1;
  const iEsp = tieneEnc ? idx(/especialidad|oficio/) : -1;

  if (iRut < 0 && cuerpo[0]) iRut = cuerpo[0].findIndex((c) => rutValido(c));
  if (iNom < 0 && cuerpo[0]) iNom = cuerpo[0].findIndex((c, i) => i !== iRut && /[a-záéíóúñ]{2,}\s+[a-záéíóúñ]/i.test(c));
  if (iCar < 0 && cuerpo[0]) iCar = cuerpo[0].findIndex((c, i) => i !== iRut && i !== iNom && /maestro|jornal|capataz|supervisor/i.test(c));

  return cuerpo.map((c) => ({
    nombre: [c[iNom], ...iApe.map((i) => c[i])].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
    rut: c[iRut] ?? '',
    cargoTexto: iCar >= 0 ? c[iCar] ?? '' : '',
    especialidad: iEsp >= 0 ? c[iEsp] ?? '' : '',
  }));
}

export default function Importar() {
  const { E, trabajadores, obras, contratos, evaluaciones, recargar, esGerente } = useDatos();
  const avisar = useToast();
  const [texto, setTexto] = useState('');
  const [progreso, setProgreso] = useState(null);
  const archivo = useRef(null);

  const filas = useMemo(() => {
    const existentes = new Set(trabajadores.map((t) => limpiarRut(t.rut)));
    const vistos = new Set();
    return interpretar(texto).map((f) => {
      const k = limpiarRut(f.rut);
      let estado = 'ok';
      if (!f.nombre) estado = 'sin_nombre';
      else if (!rutValido(f.rut)) estado = 'rut_invalido';
      else if (existentes.has(k)) estado = 'existe';
      else if (vistos.has(k)) estado = 'repetido';
      vistos.add(k);
      return { ...f, cargo: cargoDesdeTexto(f.cargoTexto), estado };
    });
  }, [texto, trabajadores]);

  const validas = filas.filter((f) => f.estado === 'ok');
  const cuenta = (e) => filas.filter((f) => f.estado === e).length;

  const leer = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    // Excel en Chile suele exportar CSV en latin-1.
    let t = new TextDecoder('utf-8').decode(buf);
    if (t.includes('�')) t = new TextDecoder('windows-1252').decode(buf);
    setTexto(t);
  };

  const importar = async () => {
    const lote = 200;
    setProgreso(0);
    try {
      for (let i = 0; i < validas.length; i += lote) {
        await E.Trabajador.bulkCreate(validas.slice(i, i + lote).map((f) => ({ nombre: f.nombre, rut: normalizarRut(f.rut), cargo: f.cargo, especialidad: f.especialidad })));
        setProgreso(Math.min(1, (i + lote) / validas.length));
      }
      await recargar();
      avisar(`${validas.length} trabajadores importados`);
      setTexto('');
    } catch {
      avisar('La importación se interrumpió. Revisa y vuelve a intentar: los ya cargados aparecerán como existentes.', 'bad');
    } finally {
      setProgreso(null);
    }
  };

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

  const ESTADOS = { ok: ['Nuevo', 'ok'], existe: ['Ya existe', 'muted'], repetido: ['Repetido', 'warn'], rut_invalido: ['RUT inválido', 'bad'], sin_nombre: ['Sin nombre', 'bad'] };

  return (
    <div>
      <Encabezado eyebrow="Base actual de personal" titulo="Importar personal">
        Copia las columnas desde Excel (nombre, RUT y cargo) y pégalas aquí, o sube un CSV. Los RUT que ya están en la base se omiten.
      </Encabezado>

      {esGerente && demo.length > 0 && (
        <div className="slab mb-6 flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center">
          <div className="hazard absolute inset-y-0 left-0 w-2" />
          <div className="flex-1 pl-2">
            <p className="font-bold">Hay datos de demostración cargados</p>
            <p className="text-sm text-bone-400">{demo.length} registros ficticios para mostrar la app. Bórralos antes de cargar la base real.</p>
          </div>
          <button onClick={borrarDemo} disabled={borrando} className="btn-ghost border-alerta/40 text-alerta hover:bg-alerta/10"><Trash2 className="h-4 w-4" /> Borrar demo</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="slab flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <label className="label mb-0" htmlFor="imp-texto">Datos</label>
            <button onClick={() => archivo.current?.click()} className="btn-ghost px-3 py-2 text-sm"><FileSpreadsheet className="h-4 w-4" /> Subir CSV</button>
            <input ref={archivo} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={leer} />
          </div>
          <textarea
            id="imp-texto"
            className="field blueprint min-h-[320px] flex-1 font-mono text-sm leading-relaxed"
            placeholder={'Nombre\tRUT\tCargo\nJuan Pérez Soto\t12.345.678-5\tMaestro primera\nPedro Rojas Díaz\t9.876.543-3\tJornal'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>

        <div className="slab flex min-h-[400px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/[.06] p-4">
            <span className="mr-auto text-sm font-bold">{filas.length ? `${filas.length} filas detectadas` : 'Vista previa'}</span>
            {Object.entries(ESTADOS).map(([k, [l, t]]) => cuenta(k) > 0 && <Chip key={k} tono={t}>{cuenta(k)} {l.toLowerCase()}</Chip>)}
          </div>
          <div className="flex-1 overflow-auto">
            {filas.length ? (
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-ink-700 text-xs text-bone-500">
                  <tr><th className="px-4 py-2 font-semibold">Nombre</th><th className="px-2 py-2 font-semibold">RUT</th><th className="px-2 py-2 font-semibold">Cargo</th><th className="px-4 py-2" /></tr>
                </thead>
                <tbody className="divide-y divide-white/[.04]">
                  {filas.slice(0, 200).map((f, i) => (
                    <tr key={i} className={f.estado === 'ok' ? '' : 'opacity-60'}>
                      <td className="max-w-[180px] truncate px-4 py-2">{f.nombre || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-xs">{formatearRut(f.rut)}</td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-bone-400">{cargoLabel(f.cargo)}</td>
                      <td className="px-4 py-2 text-right"><Chip tono={ESTADOS[f.estado][1]}>{ESTADOS[f.estado][0]}</Chip></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid h-full place-items-center p-8 text-center text-sm text-bone-500">
                <div><Upload className="mx-auto mb-3 h-8 w-8 text-bone-600" strokeWidth={1.5} />Pega datos para ver cómo se interpretan.</div>
              </div>
            )}
          </div>
          <div className="border-t border-white/[.06] p-4">
            {progreso !== null && (
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/[.06]">
                <motion.div className="hazard h-full" animate={{ width: `${progreso * 100}%` }} transition={{ ease }} />
              </div>
            )}
            <button onClick={importar} className="btn-primary w-full" disabled={!validas.length || progreso !== null}>
              Importar {validas.length || ''} {validas.length === 1 ? 'trabajador' : 'trabajadores'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
