import { useEffect, useState } from 'react';
import { Loader2, Lock, LogOut, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Escenario } from '@/pages/Login';

export default function AccesoPendiente({ usuario }) {
  const [revisando, setRevisando] = useState(true);

  // Si el jefe de personal lo invitó como jefe de obra, el acceso se activa solo.
  useEffect(() => {
    base44.functions.invoke('reclamar-acceso', {})
      .then((r) => { if (r.data?.acceso) window.location.reload(); else setRevisando(false); })
      .catch(() => setRevisando(false));
  }, []);

  if (revisando) {
    return (
      <Escenario>
        <p className="eyebrow mb-4 text-obra-300">Un momento</p>
        <h1 className="display text-[40px] sm:text-5xl">Revisando<br />tu <span className="text-obra">invitación</span>.</h1>
        <Loader2 className="mt-8 h-8 w-8 animate-spin text-obra" />
      </Escenario>
    );
  }

  return (
    <Escenario>
      <p className="eyebrow mb-4 text-hivis">Uso interno</p>
      <h1 className="display text-[40px] sm:text-5xl">
        Acceso solo
        <br />
        por <span className="text-obra">invitación</span>.
      </h1>
      <div className="slab mt-8 overflow-hidden">
        <div className="hazard h-2" />
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-hivis" />
            <p className="min-w-0 text-bone-300">
              El correo <b className="break-all text-bone">{usuario.email}</b> no tiene una invitación. Cuadrilla es de uso interno: si deberías tener acceso, pídele al <b className="text-bone">jefe de personal</b> que te invite.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => window.location.reload()} className="btn-primary flex-1"><RefreshCw className="h-4 w-4" /> Ya me invitaron</button>
            <button onClick={() => base44.auth.logout('/')} className="btn-ghost"><LogOut className="h-4 w-4" /> Salir</button>
          </div>
        </div>
      </div>
    </Escenario>
  );
}
