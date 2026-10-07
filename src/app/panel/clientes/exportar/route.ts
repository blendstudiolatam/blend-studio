import type { NextRequest } from "next/server";
import { requireModulo } from "@/lib/auth/sesion";
import { codigoCliente, estadoCliente, ETIQUETA_ESTADO_CLIENTE, hoyPanama } from "@/lib/clientes";
import { crearCsv, crearXlsx, type Columna, type Fila } from "@/lib/excel.server";
import { createClient } from "@/lib/supabase/server";

const COLUMNAS_IMPORTAR: Columna[] = [
  { titulo: "Nombre", clave: "nombre" },
  { titulo: "Apellido", clave: "apellido" },
  { titulo: "Teléfono", clave: "telefono" },
  { titulo: "Correo", clave: "email", ancho: 28 },
  { titulo: "Fecha de nacimiento (AAAA-MM-DD)", clave: "fecha_nacimiento", ancho: 22 },
  { titulo: "Género (F/M/O)", clave: "genero", ancho: 12 },
  { titulo: "Documento", clave: "documento" },
  { titulo: "Dirección", clave: "direccion", ancho: 30 },
  { titulo: "Notas", clave: "notas", ancho: 40 },
];

const COLUMNAS_EXPORTAR: Columna[] = [
  { titulo: "Código", clave: "codigo", ancho: 10 },
  ...COLUMNAS_IMPORTAR,
  { titulo: "Recordatorios WhatsApp", clave: "recordatorios", ancho: 14 },
  { titulo: "Permite fotos", clave: "fotos", ancho: 12 },
  { titulo: "Estado", clave: "estado", ancho: 10 },
  { titulo: "Registrado", clave: "registrado", ancho: 12 },
];

/**
 * Descarga la lista de clientes (xlsx o csv) o la plantilla para importar.
 * Solo para quien puede editar Clientes: es la base de datos completa de personas.
 */
export async function GET(request: NextRequest) {
  await requireModulo("clientes", true);
  const formato = request.nextUrl.searchParams.get("formato");
  const fecha = hoyPanama();

  if (formato === "plantilla") {
    const ejemplo: Fila = {
      nombre: "Ana",
      apellido: "Pérez",
      telefono: "+507 6000-0000",
      email: "ana@ejemplo.com",
      fecha_nacimiento: "1990-05-20",
      genero: "F",
      documento: "8-000-0000",
      direccion: "",
      notas: "Fila de ejemplo: bórrala antes de importar",
    };
    return archivo(await crearXlsx("Clientes", COLUMNAS_IMPORTAR, [ejemplo]), "plantilla-clientes.xlsx");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select(
      "codigo, nombre, apellido, telefono, email, fecha_nacimiento, genero, documento, direccion, notas, recordatorios_whatsapp, permitir_fotos, activo, created_at",
    )
    .order("codigo")
    .limit(20000);
  if (error) return new Response("No se pudo exportar.", { status: 500 });

  const filas: Fila[] = (data ?? []).map((c) => ({
    codigo: codigoCliente(c.codigo),
    nombre: c.nombre,
    apellido: c.apellido,
    telefono: c.telefono ?? "",
    email: c.email ?? "",
    fecha_nacimiento: c.fecha_nacimiento ?? "",
    genero: c.genero ?? "",
    documento: c.documento ?? "",
    direccion: c.direccion ?? "",
    notas: c.notas ?? "",
    recordatorios: c.recordatorios_whatsapp ? "Sí" : "No",
    fotos: c.permitir_fotos ? "Sí" : "No",
    estado: ETIQUETA_ESTADO_CLIENTE[estadoCliente(c.activo, c.created_at)],
    registrado: new Date(c.created_at).toLocaleDateString("en-CA", { timeZone: "America/Panama" }),
  }));

  if (formato === "csv") {
    return archivo(crearCsv(COLUMNAS_EXPORTAR, filas), `clientes-${fecha}.csv`);
  }
  return archivo(await crearXlsx("Clientes", COLUMNAS_EXPORTAR, filas), `clientes-${fecha}.xlsx`);
}

function archivo(contenido: Buffer | string, nombre: string) {
  const tipo = nombre.endsWith(".csv")
    ? "text/csv; charset=utf-8"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return new Response(typeof contenido === "string" ? contenido : new Uint8Array(contenido), {
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
