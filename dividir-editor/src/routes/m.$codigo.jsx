import { createFileRoute } from "@tanstack/react-router";
import Invitado from "@/components/pantallas/Invitado";

// Lo que abren los amigos al escanear el QR: sin cuenta.
export const Route = createFileRoute("/m/$codigo")({
  ssr: false,
  head: () => ({ meta: [{ title: "Paga tu parte · Dividir" }] }),
  component: Pagina,
});

function Pagina() {
  const { codigo } = Route.useParams();
  return <Invitado codigo={codigo} />;
}
