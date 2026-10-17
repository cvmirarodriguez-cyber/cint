import * as XLSX from 'xlsx';
import { cargoLabel, nota } from '@/lib/dominio';

const RECON = { si: 'Sí', con_reservas: 'Con reservas', no: 'No' };
const AD = { sin_observaciones: 'Sin observaciones', sospecha: 'Sospecha', confirmado: 'Confirmado' };

function fechaCorta(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('es-CL'); } catch { return d; }
}

function nombreArchivo(prefijo) {
  const f = new Date().toISOString().slice(0, 10);
  return `${prefijo}_${f}`;
}

export function exportarExcel({ kpis, filtradas, porMes, peores, headcount, mesLabel, obraLabel }) {
  const wb = XLSX.utils.book_new();

  const resumen = [
    ['Reporte de gestión — Cuadrilla'],
    ['Período', mesLabel],
    ['Obra', obraLabel],
    ['Generado', new Date().toLocaleString('es-CL')],
    [''],
    ['Métrica', 'Valor'],
    ['Evaluaciones', kpis.n],
    ['Promedio general', +kpis.promedio.toFixed(2)],
    ['Bajo desempeño (<3)', kpis.bajos],
    ['Alertas alcohol/drogas', kpis.alertas],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

  const evals = filtradas.map((e) => ({
    Trabajador: e.trabajador_nombre || '',
    RUT: e.trabajador_rut || '',
    Cargo: cargoLabel(e.cargo),
    Obra: e.obra_nombre || '',
    Desempeño: e.desempeno || '',
    Responsabilidad: e.responsabilidad || '',
    Promedio: +nota(e).toFixed(1),
    'Alcohol/drogas': AD[e.alcohol_drogas] || e.alcohol_drogas || '',
    Recontratar: RECON[e.recontratar] || e.recontratar || '',
    Evaluador: e.evaluador_nombre || '',
    Fecha: fechaCorta(e.created_date),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evals.length ? evals : [{}]), 'Evaluaciones');

  const mesRows = porMes.map((d) => ({ Mes: d.label, Evaluaciones: d.n, Promedio: d.prom }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mesRows.length ? mesRows : [{}]), 'Por mes');

  const peoresRows = peores.map((t, i) => ({
    '#': i + 1,
    Trabajador: t.nombre,
    Cargo: cargoLabel(t.cargo),
    Obra: t.obra || '',
    Evaluaciones: t.r.n,
    Promedio: +t.r.promedio.toFixed(1),
    'Alerta A/D': t.r.alerta ? 'Sí' : 'No',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(peoresRows.length ? peoresRows : [{}]), 'Peores calificados');

  const dot = headcount.map((h) => ({ Obra: h.nombre, Headcount: h.headcount, Vigentes: h.vigentes, Pendientes: h.pendientes }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dot.length ? dot : [{}]), 'Dotación');

  XLSX.writeFile(wb, `${nombreArchivo('reporte')}.xlsx`);
}

// Escapa texto antes de insertarlo en el HTML del PDF (los nombres vienen de datos cargados por usuarios).
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function tabla(html, titulo, cols, filas) {
  const th = cols.map((c) => `<th>${esc(c)}</th>`).join('');
  const trs = filas.length
    ? filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${cols.length}" style="text-align:center;color:#888">Sin datos</td></tr>`;
  return `
    <section>
      <h2>${esc(titulo)}</h2>
      <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>
    </section>`;
}

export function exportarPDF({ kpis, filtradas, porMes, peores, headcount, mesLabel, obraLabel }) {
  const kpisHtml = `
    <section class="kpis">
      <div class="kpi"><span>Evaluaciones</span><b>${kpis.n}</b></div>
      <div class="kpi"><span>Promedio general</span><b>${kpis.promedio.toFixed(1)}</b></div>
      <div class="kpi"><span>Bajo desempeño</span><b>${kpis.bajos}</b></div>
      <div class="kpi"><span>Alertas A/D</span><b>${kpis.alertas}</b></div>
    </section>`;

  const evalFilas = filtradas.map((e) => [
    e.trabajador_nombre || '',
    cargoLabel(e.cargo),
    e.obra_nombre || '',
    e.desempeno || '—',
    e.responsabilidad || '—',
    nota(e).toFixed(1),
    AD[e.alcohol_drogas] || '',
    RECON[e.recontratar] || '',
    fechaCorta(e.created_date),
  ]);
  const evalTabla = tabla(kpisHtml, 'Evaluaciones del período',
    ['Trabajador', 'Cargo', 'Obra', 'Desemp.', 'Resp.', 'Prom.', 'A/D', 'Recontratar', 'Fecha'], evalFilas);

  const mesFilas = porMes.map((d) => [d.label, d.n, d.prom]);
  const mesTabla = tabla('', 'Evaluaciones por mes', ['Mes', 'Cantidad', 'Promedio'], mesFilas);

  const peoresFilas = peores.map((t, i) => [i + 1, t.nombre, cargoLabel(t.cargo), t.obra || '', t.r.n, t.r.promedio.toFixed(1), t.r.alerta ? 'Sí' : 'No']);
  const peoresTabla = tabla('', 'Peores calificados', ['#', 'Trabajador', 'Cargo', 'Obra', 'Evals.', 'Promedio', 'Alerta'], peoresFilas);

  const dotFilas = headcount.map((h) => [h.nombre, h.headcount, h.vigentes, h.pendientes]);
  const dotTabla = tabla('', 'Dotación por proyecto', ['Obra', 'Headcount', 'Vigentes', 'Pendientes'], dotFilas);

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Reporte de gestión — Cuadrilla</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 32px; }
      header { border-bottom: 3px solid #FF5F1F; padding-bottom: 12px; margin-bottom: 20px; }
      header h1 { margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: .5px; }
      header p { margin: 4px 0 0; color: #666; font-size: 12px; }
      h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: #FF5F1F; margin: 24px 0 8px; }
      .kpis { display: flex; gap: 12px; margin: 16px 0 4px; }
      .kpi { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
      .kpi span { display: block; font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: .5px; }
      .kpi b { font-size: 22px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
      th { background: #f4f4f4; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; }
      td { padding: 5px 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #fafafa; }
      footer { margin-top: 28px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
    </style></head><body>
    <header>
      <h1>Reporte de gestión</h1>
      <p>Período: ${esc(mesLabel)} &nbsp;·&nbsp; Obra: ${esc(obraLabel)} &nbsp;·&nbsp; Generado: ${esc(new Date().toLocaleString('es-CL'))}</p>
    </header>
    ${evalTabla}
    ${mesTabla}
    ${peoresTabla}
    ${dotTabla}
    <footer>Documento generado por Cuadrilla — sistema de gestión de personal de terreno.</footer>
    </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Activa las ventanas emergentes para exportar el PDF.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}