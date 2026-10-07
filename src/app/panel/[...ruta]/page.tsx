import { notFound } from "next/navigation";
import { Encabezado } from "@/components/panel/encabezado";
import { buscarRuta } from "@/components/panel/navegacion";
import { requirePanel } from "@/lib/auth/sesion";

/** Página provisional de los módulos que todavía no están construidos. */
export default async function ModuloPendientePage({ params }: PageProps<"/panel/[...ruta]">) {
  const { rol } = await requirePanel();
  const { ruta } = await params;
  const { modulo, hijo } = buscarRuta(`/panel/${ruta.join("/")}`);

  // Ruta inexistente o módulo que este rol no ve.
  if (!modulo || !modulo.roles.includes(rol) || ruta.length > 2) notFound();
  if (ruta.length === 2 && !hijo) notFound();
  if (hijo?.roles && !hijo.roles.includes(rol)) notFound();

  const fase = hijo?.fase ?? modulo.fase;

  return (
    <div className="space-y-8">
      <Encabezado
        icono={modulo.icono}
        titulo={hijo?.nombre ?? modulo.nombre}
        subtitulo={modulo.descripcion}
      />
      <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold-strong">Próximamente</p>
        <p className="mt-3 font-display text-2xl">Este módulo llega en la Fase {fase}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Ya aparece en el menú para que veas la estructura completa de la app.
        </p>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps<"/panel/[...ruta]">) {
  const { ruta } = await params;
  const { modulo, hijo } = buscarRuta(`/panel/${ruta.join("/")}`);
  return { title: hijo?.nombre ?? modulo?.nombre ?? "Panel" };
}
