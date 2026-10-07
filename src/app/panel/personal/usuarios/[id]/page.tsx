import { ArrowLeft, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Encabezado } from "@/components/panel/encabezado";
import { ETIQUETA_ROL, type ModuloApp, type NivelPermiso, type Rol } from "@/lib/auth/permisos";
import { requireModulo } from "@/lib/auth/sesion";
import { createClient } from "@/lib/supabase/server";
import { PermisosPersona } from "./permisos-persona";

export const metadata: Metadata = { title: "Permisos del usuario" };

export default async function PermisosUsuarioPage({ params }: PageProps<"/panel/personal/usuarios/[id]">) {
  const ctx = await requireModulo("personal");
  if (ctx.rol !== "admin") notFound();

  const { id } = await params;
  const parsed = z.guid().safeParse(id);
  if (!parsed.success || parsed.data === ctx.usuario.id) notFound();

  const supabase = await createClient();
  const { data: acceso } = await supabase
    .from("accesos")
    .select("rol, perfil:perfiles!inner(nombre_completo, email)")
    .eq("usuario_id", parsed.data)
    .eq("sucursal_id", ctx.sucursal.id)
    .maybeSingle();
  if (!acceso) notFound();

  const rol = acceso.rol as Rol;
  const [{ data: matriz }, { data: ajustes }] = await Promise.all([
    supabase.from("permisos_rol").select("modulo, nivel").eq("rol", rol),
    supabase
      .from("permisos_usuario")
      .select("modulo, nivel")
      .eq("usuario_id", parsed.data)
      .eq("sucursal_id", ctx.sucursal.id),
  ]);

  const nombre = acceso.perfil.nombre_completo || acceso.perfil.email || "Usuario";

  return (
    <div className="space-y-8">
      <Link
        href="/panel/personal/usuarios"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a usuarios
      </Link>
      <Encabezado
        icono={KeyRound}
        titulo={nombre}
        subtitulo={`${ETIQUETA_ROL[rol]} en ${ctx.sucursal.nombre}. Ajusta permisos solo para esta persona.`}
      />
      <PermisosPersona
        usuarioId={parsed.data}
        rol={rol}
        delRol={Object.fromEntries((matriz ?? []).map((m) => [m.modulo, m.nivel])) as Record<ModuloApp, NivelPermiso>}
        ajustes={Object.fromEntries((ajustes ?? []).map((a) => [a.modulo, a.nivel])) as Partial<Record<ModuloApp, NivelPermiso>>}
      />
    </div>
  );
}
