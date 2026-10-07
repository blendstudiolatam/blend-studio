import { BarraSuperior } from "@/components/panel/barra-superior";
import { MenuLateral } from "@/components/panel/menu-lateral";
import { requirePanel, type Rol } from "@/lib/auth/sesion";

const etiquetas: Record<Rol, string> = {
  admin: "Administración",
  recepcion: "Recepción",
  estilista: "Profesional",
};

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  // Cada página del panel vuelve a llamar a requirePanel(): el layout solo pinta el marco.
  const ctx = await requirePanel();

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:pl-64">
      <MenuLateral
        rol={ctx.rol}
        etiquetaRol={ctx.esDueno ? "Propietario" : etiquetas[ctx.rol]}
        sucursal={ctx.sucursal.nombre}
        variasSucursales={ctx.sucursales.length > 1}
      />
      <BarraSuperior />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
