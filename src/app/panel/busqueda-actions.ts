"use server";

import { enPanama, hoyEnPanama, instante } from "@/lib/agenda";
import { requirePanel } from "@/lib/auth/sesion";
import { codigoCliente, normalizarBusqueda } from "@/lib/clientes";
import { createClient } from "@/lib/supabase/server";

export type ResultadoBusqueda = {
  clientes: { id: string; nombre: string; detalle: string }[];
  citas: { id: string; clienteId: string; titulo: string; fecha: string; detalle: string }[];
};

/** Buscador global de la barra superior: clientes y sus próximas citas/sesiones. */
export async function busquedaGlobal(texto: string): Promise<ResultadoBusqueda> {
  const ctx = await requirePanel();
  const vacio = { clientes: [], citas: [] };
  const q = normalizarBusqueda(String(texto ?? ""));
  if (q.length < 2 || ctx.permisos.clientes === "ninguno") return vacio;

  const supabase = await createClient();
  let consulta = supabase.from("clientes").select("id, codigo, nombre, apellido, telefono");
  const codigo = q.match(/^c-?0*(\d{1,7})$/);
  const digitos = q.replace(/[\s()+-]/g, "");
  if (codigo) consulta = consulta.eq("codigo", Number(codigo[1]));
  else if (/^\d{3,}$/.test(digitos)) consulta = consulta.like("telefono_digitos", `%${digitos}%`);
  else for (const p of q.split(" ")) consulta = consulta.ilike("busqueda", `%${p}%`);
  const { data: clientes } = await consulta.order("activo", { ascending: false }).order("nombre").limit(6);
  if (!clientes?.length) return vacio;

  let citas: ResultadoBusqueda["citas"] = [];
  if (ctx.permisos.agenda !== "ninguno") {
    const { data } = await supabase
      .from("citas")
      .select("id, cliente_id, inicio, estado, servicio:servicios(nombre), sesion:sesiones_tratamiento(numero, plan:planes_tratamiento(procedimiento, sesiones_total)), empleado:empleados(nombre)")
      .eq("sucursal_id", ctx.sucursal.id)
      .in("cliente_id", clientes.map((c) => c.id))
      .in("estado", ["pendiente", "confirmada"])
      .gte("inicio", instante(hoyEnPanama(), "00:00"))
      .order("inicio")
      .limit(5);
    citas = (data ?? []).map((c) => {
      const cli = clientes.find((x) => x.id === c.cliente_id);
      const a = enPanama(c.inicio);
      return {
        id: c.id,
        clienteId: c.cliente_id,
        titulo: `${cli?.nombre ?? ""} ${cli?.apellido ?? ""}`.trim(),
        fecha: a.fecha,
        detalle: [
          c.sesion?.plan ? `${c.sesion.plan.procedimiento} (sesión ${c.sesion.numero}/${c.sesion.plan.sesiones_total})` : (c.servicio?.nombre ?? "Cita"),
          a.hora,
          c.empleado?.nombre,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    });
  }

  return {
    clientes: clientes.map((c) => ({
      id: c.id,
      nombre: `${c.nombre} ${c.apellido}`.trim(),
      detalle: [codigoCliente(c.codigo), c.telefono].filter(Boolean).join(" · "),
    })),
    citas,
  };
}
