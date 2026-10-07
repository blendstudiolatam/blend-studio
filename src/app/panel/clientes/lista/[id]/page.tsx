import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { requireModulo } from "@/lib/auth/sesion";
import {
  CLASE_ESTADO_CLIENTE,
  codigoCliente,
  edad,
  enlaceWhatsApp,
  estadoCliente,
  ETIQUETA_ESTADO_CLIENTE,
  ETIQUETA_GENERO,
  type Genero,
} from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";
import { FormularioCliente } from "../formulario-cliente";
import type { FilaCliente } from "../lista-clientes";
import { DocumentosCliente, type Documento } from "./documentos-cliente";
import { HistorialMedico, type Consulta, type DatosSalud } from "./historial-medico";

export const metadata: Metadata = { title: "Ficha del cliente" };

const PESTANAS = [
  { id: "datos", nombre: "Datos personales" },
  { id: "salud", nombre: "Historial médico", sensible: true },
  { id: "tratamientos", nombre: "Planes de tratamiento" },
  { id: "documentos", nombre: "Documentos", sensible: true },
  { id: "facturas", nombre: "Facturas y recibos" },
  { id: "ventas", nombre: "Ventas" },
] as const;

const PROXIMAMENTE: Record<string, { titulo: string; texto: string }> = {
  tratamientos: {
    titulo: "Planes de tratamiento",
    texto: "Paquetes de sesiones con progreso, pagos y recordatorios. Llega en la próxima sesión de trabajo.",
  },
  facturas: { titulo: "Facturas y recibos", texto: "Se llenará con el punto de venta y la factura electrónica (Fase 2)." },
  ventas: { titulo: "Ventas del cliente", texto: "Servicios y productos comprados, con totales. Llega con el punto de venta (Fase 2)." },
};

export default async function FichaClientePage({ params, searchParams }: PageProps<"/panel/clientes/lista/[id]">) {
  const ctx = await requireModulo("clientes");
  const { id } = await params;
  const { tab } = await searchParams;
  const cliId = z.guid().safeParse(id);
  if (!cliId.success) notFound();

  const supabase = await createClient();
  const [{ data: c }, { data: permisos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", cliId.data).maybeSingle(),
    supabase.rpc("permisos_salud", { p_cliente: cliId.data }).single(),
  ]);
  if (!c) notFound();

  const verSalud = Boolean(permisos?.ver);
  const editarSalud = Boolean(permisos?.editar);
  const visibles = PESTANAS.filter((p) => !("sensible" in p) || verSalud);
  const pestana = visibles.find((p) => p.id === tab)?.id ?? "datos";

  const foto = c.foto_path
    ? ((await supabase.storage.from("clientes").createSignedUrl(c.foto_path, 3600)).data?.signedUrl ?? null)
    : null;
  const nombre = `${c.nombre} ${c.apellido}`.trim();
  const anios = edad(c.fecha_nacimiento);
  const estado = estadoCliente(c.activo, c.created_at);
  const whatsapp = enlaceWhatsApp(c.telefono);

  const fila: FilaCliente = {
    id: c.id,
    codigo: c.codigo,
    nombre: c.nombre,
    apellido: c.apellido,
    fechaNacimiento: c.fecha_nacimiento,
    genero: c.genero as Genero | null,
    documento: c.documento,
    telefono: c.telefono,
    email: c.email,
    direccion: c.direccion,
    notas: c.notas,
    recordatoriosWhatsapp: c.recordatorios_whatsapp,
    permitirFotos: c.permitir_fotos,
    foto,
    activo: c.activo,
    creado: c.created_at,
  };

  return (
    <div className="space-y-8">
      <Link href="/panel/clientes/lista" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a clientes
      </Link>

      <div className="flex flex-wrap items-center gap-5">
        <Avatar nombre={nombre} foto={foto} tamano={84} privada />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl leading-tight">{nombre}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO_CLIENTE[estado]}`}>
              {ETIQUETA_ESTADO_CLIENTE[estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {codigoCliente(c.codigo)}
            {anios !== null && ` · ${anios} años`}
            {c.genero && ` · ${ETIQUETA_GENERO[c.genero as Genero]}`}
            {` · Cliente desde ${new Date(c.created_at).toLocaleDateString("es-PA", { timeZone: "America/Panama", month: "long", year: "numeric" })}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {c.telefono && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted" /> {c.telefono}
              </span>
            )}
            {c.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted" /> {c.email}
              </span>
            )}
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Secciones de la ficha">
        {visibles.map((p) => (
          <Link
            key={p.id}
            href={p.id === "datos" ? "?" : `?tab=${p.id}`}
            // Sin precarga: abrir el historial queda registrado, y solo debe pasar al tocarlo.
            prefetch={false}
            aria-current={pestana === p.id ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm transition ${
              pestana === p.id ? "border-gold text-foreground" : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {p.nombre}
          </Link>
        ))}
      </nav>

      {pestana === "datos" && (
        <div className="max-w-3xl">
          <FormularioCliente cliente={fila} editable={ctx.permisos.clientes === "total"} puedeEliminar={ctx.rol === "admin"} />
        </div>
      )}
      {pestana === "salud" && <PestanaSalud clienteId={c.id} editable={editarSalud} verRegistro={ctx.rol === "admin"} />}
      {pestana === "documentos" && <PestanaDocumentos clienteId={c.id} editable={editarSalud} />}
      {PROXIMAMENTE[pestana] && (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-strong">Próximamente</p>
          <p className="mt-3 font-display text-2xl">{PROXIMAMENTE[pestana].titulo}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">{PROXIMAMENTE[pestana].texto}</p>
        </div>
      )}
    </div>
  );
}

async function PestanaSalud({ clienteId, editable, verRegistro }: { clienteId: string; editable: boolean; verRegistro: boolean }) {
  const supabase = await createClient();
  // Esta lectura queda registrada en la base de datos (quién y cuándo).
  const { data, error } = await supabase.rpc("ver_historial_medico", { p_cliente: clienteId });
  if (error) notFound();
  const salud = data as unknown as DatosSalud;

  let consultas: Consulta[] = [];
  if (verRegistro) {
    const { data: filas } = await supabase
      .from("consultas_salud")
      .select("id, accion, detalle, created_at, usuario:perfiles(nombre_completo)")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(30);
    consultas = (filas ?? []).map((f) => ({
      id: f.id,
      accion: f.accion,
      detalle: f.detalle,
      fecha: f.created_at,
      usuario: f.usuario?.nombre_completo ?? "Usuario",
    }));
  }
  return <HistorialMedico clienteId={clienteId} inicial={salud} editable={editable} consultas={verRegistro ? consultas : null} />;
}

async function PestanaDocumentos({ clienteId, editable }: { clienteId: string; editable: boolean }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("documentos_de_cliente", { p_cliente: clienteId });
  if (error) notFound();
  const documentos: Documento[] = (data ?? []).map((d) => ({
    id: d.id,
    categoria: d.categoria,
    nombre: d.nombre,
    tipo: d.tipo,
    tamano: d.tamano,
    subidoPor: d.subido_por_nombre,
    fecha: d.created_at,
  }));
  return <DocumentosCliente clienteId={clienteId} documentos={documentos} editable={editable} />;
}
