import type { Metadata } from "next";
import { requireModulo } from "@/lib/auth/sesion";
import { limiteClienteNuevo, normalizarBusqueda, type EstadoCliente, type Genero } from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";
import { ListaClientes, type FilaCliente } from "./lista-clientes";

export const metadata: Metadata = { title: "Clientes" };

const POR_PAGINA = 25;
const ESTADOS: (EstadoCliente | "todos")[] = ["todos", "activo", "nuevo", "inactivo"];

export default async function ListaClientesPage({ searchParams }: PageProps<"/panel/clientes/lista">) {
  const ctx = await requireModulo("clientes");
  const params = await searchParams;
  const texto = typeof params.q === "string" ? params.q.slice(0, 60) : "";
  const estado = ESTADOS.find((e) => e === params.estado) ?? "todos";
  const pagina = Math.max(1, Math.min(10_000, Number(params.pagina) || 1));

  const supabase = await createClient();
  const limiteNuevo = limiteClienteNuevo();

  let consulta = supabase
    .from("clientes")
    .select(
      "id, codigo, nombre, apellido, fecha_nacimiento, genero, documento, telefono, email, direccion, notas, recordatorios_whatsapp, permitir_fotos, foto_path, activo, created_at",
      { count: "exact" },
    );

  // Búsqueda por nombre, código (C-0007), teléfono, correo o documento.
  const q = normalizarBusqueda(texto);
  const codigo = q.match(/^c-?0*(\d{1,7})$/);
  const digitos = q.replace(/[\s()+-]/g, "");
  if (codigo) {
    consulta = consulta.eq("codigo", Number(codigo[1]));
  } else if (/^\d{3,}$/.test(digitos)) {
    consulta = consulta.or(`telefono_digitos.like.*${digitos}*,busqueda.like.*${digitos}*`);
  } else if (q) {
    for (const palabra of q.split(" ")) consulta = consulta.ilike("busqueda", `%${palabra}%`);
  }

  if (estado === "inactivo") consulta = consulta.eq("activo", false);
  if (estado === "activo") consulta = consulta.eq("activo", true);
  if (estado === "nuevo") consulta = consulta.eq("activo", true).gte("created_at", limiteNuevo);

  const desde = (pagina - 1) * POR_PAGINA;
  const contar = () => supabase.from("clientes").select("id", { count: "exact", head: true });
  const [{ data: clientes, count }, total, activos, nuevos] = await Promise.all([
    consulta.order("nombre").order("apellido").range(desde, desde + POR_PAGINA - 1),
    contar(),
    contar().eq("activo", true),
    contar().eq("activo", true).gte("created_at", limiteNuevo),
  ]);

  // Fotos privadas: enlaces temporales de 1 hora (la base de datos verifica el permiso).
  const rutas = (clientes ?? []).map((c) => c.foto_path).filter((p): p is string => Boolean(p));
  const firmadas = rutas.length ? (await supabase.storage.from("clientes").createSignedUrls(rutas, 3600)).data : [];
  const fotos = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));

  const filas: FilaCliente[] = (clientes ?? []).map((c) => ({
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
    foto: c.foto_path ? (fotos.get(c.foto_path) ?? null) : null,
    activo: c.activo,
    creado: c.created_at,
  }));

  return (
    <ListaClientes
      clientes={filas}
      indicadores={{ total: total.count ?? 0, activos: activos.count ?? 0, nuevos: nuevos.count ?? 0 }}
      filtro={{ texto, estado, pagina, porPagina: POR_PAGINA, encontrados: count ?? 0 }}
      editable={ctx.permisos.clientes === "total"}
    />
  );
}
