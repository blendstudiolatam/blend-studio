import { BarraSuperior } from "@/components/panel/barra-superior";
import { MenuLateral } from "@/components/panel/menu-lateral";
import { ETIQUETA_ROL } from "@/lib/auth/permisos";
import { requirePanel } from "@/lib/auth/sesion";
import { getMarca } from "@/lib/marca";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  // Cada página del panel vuelve a llamar a requirePanel(): el layout solo pinta el marco.
  const [ctx, marca] = await Promise.all([requirePanel(), getMarca()]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:pl-64">
      <MenuLateral
        permisos={ctx.permisos}
        rol={ctx.rol}
        etiquetaRol={ctx.esDueno ? "Propietario" : ETIQUETA_ROL[ctx.rol]}
        sucursal={ctx.sucursal.nombre}
        variasSucursales={ctx.sucursales.length > 1}
        nombreNegocio={marca.nombreComercial}
        logoUrl={marca.logoUrl}
      />
      <BarraSuperior />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
