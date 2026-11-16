import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";
import { Cargando } from "@/components/dividir";
import Login from "@/components/pantallas/Login";
import Inicio from "@/components/pantallas/Inicio";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dividir · la cuenta en un minuto" }] }),
  component: Home,
});

function Home() {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <Cargando />;
  return user ? <Inicio usuario={user} /> : <Login />;
}
