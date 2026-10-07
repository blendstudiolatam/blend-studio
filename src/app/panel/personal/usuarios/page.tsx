import { UserCog } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import type { ModuloApp, NivelPermiso, Rol } from "@/lib/auth/permisos";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import { InvitarUsuario } from "./invitar-usuario";
import { MatrizPermisos } from "./matriz-permisos";
import { TablaUsuarios, type FilaUsuario } from "./tabla-usuarios";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsuariosPage({ searchParams }: PageProps<"/panel/personal/usuarios">) {
  const ctx = await requireModulo("personal");
  // La gestión de usuarios es solo para administradores (la base de datos también lo exige).
  if (ctx.rol !== "admin") notFound();

  const { tab } = await searchParams;
  const pestana = tab === "permisos" ? "permisos" : "usuarios";
  const supabase = await createClient();

  const [{ data: accesos }, { data: matriz }] = await Promise.all([
    supabase
      .from("accesos")
      .select("id, rol, activo, usuario_id, perfil:perfiles!inner(nombre_completo, email)")
      .eq("sucursal_id", ctx.sucursal.id),
    supabase.from("permisos_rol").select("rol, modulo, nivel"),
  ]);

  const filas: FilaUsuario[] = (accesos ?? [])
    .map((a) => ({
      accesoId: a.id,
      usuarioId: a.usuario_id,
      nombre: a.perfil.nombre_completo || a.perfil.email || "Sin nombre",
      email: a.perfil.email ?? "",
      rol: a.rol as Rol,
      activo: a.activo,
      esYo: a.usuario_id === ctx.usuario.id,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const total = filas.length;
  const activos = filas.filter((f) => f.activo).length;
  const admins = filas.filter((f) => f.rol === "admin").length;

  return (
    <div className="space-y-8">
      <Encabezado
        icono={UserCog}
        titulo="Usuarios"
        subtitulo={`Quién entra al sistema en ${ctx.sucursal.nombre} y qué puede hacer.`}
        accion={<InvitarUsuario sucursal={ctx.sucursal.nombre} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Usuarios" valor={String(total)} />
        <Indicador etiqueta="Activos" valor={String(activos)} />
        <Indicador etiqueta="Inactivos" valor={String(total - activos)} />
        <Indicador etiqueta="Administradores" valor={String(admins)} />
      </div>

      <nav className="flex gap-1 border-b border-line" aria-label="Pestañas">
        {[
          { id: "usuarios", nombre: "Usuarios" },
          { id: "permisos", nombre: "Permisos por rol" },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.id === "usuarios" ? "?" : "?tab=permisos"}
            aria-current={pestana === t.id ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition ${
              pestana === t.id
                ? "border-gold text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.nombre}
          </Link>
        ))}
      </nav>

      {pestana === "usuarios" ? (
        <TablaUsuarios filas={filas} />
      ) : (
        <MatrizPermisos
          matriz={(matriz ?? []) as { rol: Rol; modulo: ModuloApp; nivel: NivelPermiso }[]}
          editable={ctx.esDueno}
        />
      )}
    </div>
  );
}
