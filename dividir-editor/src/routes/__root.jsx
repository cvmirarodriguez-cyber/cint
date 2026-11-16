import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { iniciarTema } from "@/lib/tema";
import { Base44Scripts } from "base44:document";
import appCss from "@/index.css?url";

// Aplica el tema guardado antes de pintar, para que el modo oscuro no parpadee en claro.
const SCRIPT_TEMA = `try{var t=localStorage.getItem('dividir:tema')||'sistema';if(t==='sistema')t=matchMedia('(prefers-color-scheme: dark)').matches?'oscuro':'claro';document.documentElement.dataset.tema=t}catch(e){}`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Dividir" },
      { name: "description", content: "Saca una foto a la boleta, la IA la divide y cada uno paga su parte con Mercado Pago." },
      { name: "theme-color", content: "#f3f1ec" },
      { name: "color-scheme", content: "light dark" },
    ],
    // Sin ícono: la plataforma agrega el logo de la app al servirla.
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icono.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  useEffect(() => { iniciarTema(); }, []);
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}

function RootDocument({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <HeadContent />
      </head>
      {/* data-react-root: el puente de vista previa del editor lo busca. */}
      <body data-react-root="true">
        {children}
        <Base44Scripts />
        <Scripts />
      </body>
    </html>
  );
}
