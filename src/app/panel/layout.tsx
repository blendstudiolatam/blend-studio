import { Cabecera } from "@/components/panel/cabecera";
import { requirePanel } from "@/lib/auth/sesion";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  // Cada página del panel vuelve a llamar a requirePanel(): el layout solo pinta la cabecera.
  const ctx = await requirePanel();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <Cabecera
        nombre={ctx.nombre}
        sucursal={ctx.sucursal.nombre}
        rol={ctx.rol}
        variasSucursales={ctx.sucursales.length > 1}
      />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
