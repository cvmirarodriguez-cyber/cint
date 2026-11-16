import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";
import { Cargando } from "@/components/dividir";
import Login from "@/components/pantallas/Login";
import MesaOrganizador from "@/components/pantallas/MesaOrganizador";

// Pantalla del organizador: solo con sesión (las reglas de Mesa limitan a sus propias mesas).
export const Route = createFileRoute("/mesa/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Mesa · Dividir" }] }),
  component: Pagina,
});

function Pagina() {
  const { id } = Route.useParams();
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <Cargando />;
  if (!user) return <Login />;
  return <MesaOrganizador id={id} usuario={user} />;
}
