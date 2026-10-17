import { Fragment, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Lock, ShieldCheck } from 'lucide-react';
import { Marca } from '@/components/Shell';
import { CONTACTO, DOCUMENTOS, RESPONSABLE, VIGENCIA } from '@/lib/legal';
import { ease } from '@/components/ui';

const PESTANAS = [
  ['privacidad', 'Privacidad', Lock],
  ['seguridad', 'Seguridad', ShieldCheck],
  ['terminos', 'Términos de uso', FileText],
];

const conResponsable = (t) => t.replaceAll('{RESPONSABLE}', RESPONSABLE.razonSocial || RESPONSABLE.nombre);

// Páginas públicas: se pueden abrir sin iniciar sesión (lo exigen App Store y Google Play).
export default function Legal({ conSesion = false }) {
  const { doc = 'privacidad' } = useParams();
  const d = DOCUMENTOS[doc] ?? DOCUMENTOS.privacidad;
  const clave = DOCUMENTOS[doc] ? doc : 'privacidad';

  useEffect(() => {
    document.title = `${d.titulo} · Cuadrilla`;
    window.scrollTo(0, 0);
    return () => { document.title = 'Cuadrilla · Historial de terreno'; };
  }, [d.titulo]);

  const datosResponsable = [
    RESPONSABLE.razonSocial && ['Razón social', RESPONSABLE.razonSocial],
    RESPONSABLE.rut && ['RUT', RESPONSABLE.rut],
    RESPONSABLE.domicilio && ['Domicilio', RESPONSABLE.domicilio],
    RESPONSABLE.correo && ['Correo', RESPONSABLE.correo],
  ].filter(Boolean);

  return (
    <div className={conSesion ? '' : 'min-h-dvh px-4 py-6 sm:px-8'}>
      <div className="mx-auto max-w-3xl">
        {!conSesion && (
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" aria-label="Ir a Cuadrilla"><Marca /></Link>
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-bone-500 hover:text-bone"><ArrowLeft className="h-4 w-4" /> Volver</Link>
          </div>
        )}

        <p className="eyebrow mb-2">Cuadrilla · App web y app móvil</p>
        <h1 className="display text-3xl sm:text-5xl">{d.titulo}</h1>
        <p className="mt-3 max-w-xl text-bone-400">{d.resumen}</p>
        <p className="mt-2 font-mono text-xs text-bone-600">Versión {VIGENCIA.version} · vigente desde el {VIGENCIA.fecha}</p>

        <nav aria-label="Documentos" className="my-8 flex flex-wrap gap-2">
          {PESTANAS.map(([k, l, Icono]) => (
            <Link key={k} to={`/legal/${k}`} aria-current={clave === k ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${clave === k ? 'border-obra bg-obra text-ink' : 'border-white/10 text-bone-400 hover:text-bone'}`}>
              <Icono className="h-4 w-4" /> {l}
            </Link>
          ))}
        </nav>

        <motion.article key={clave} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }} className="slab p-6 sm:p-8">
          <div className="space-y-7">
            {d.secciones.map((s) => (
              <section key={s.titulo}>
                <h2 className="mb-2 text-lg font-bold text-bone">{s.titulo}</h2>
                {s.parrafos?.map((p, i) => <p key={i} className="mb-2 leading-relaxed text-bone-300">{conResponsable(p)}</p>)}
                {s.lista && (
                  <ul className="space-y-1.5">
                    {s.lista.map((li, i) => (
                      <li key={i} className="flex gap-2.5 leading-relaxed text-bone-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-obra" />{conResponsable(li)}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section>
              <h2 className="mb-2 text-lg font-bold text-bone">Contacto</h2>
              {datosResponsable.length > 0 && (
                <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  {datosResponsable.map(([k, v]) => <Fragment key={k}><dt className="text-bone-500">{k}</dt><dd className="text-bone-300">{v}</dd></Fragment>)}
                </dl>
              )}
              <ul className="space-y-1.5">
                {CONTACTO.map((c) => <li key={c} className="flex gap-2.5 leading-relaxed text-bone-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-obra" />{c}</li>)}
              </ul>
            </section>
          </div>
        </motion.article>

        <p className="mt-6 pb-10 text-center text-xs text-bone-600">© {new Date().getFullYear()} Cuadrilla · Uso interno</p>
      </div>
    </div>
  );
}
