"use client";

import { Clock, Globe, KeyRound, Mail, Percent, Phone, Plus, Search, UserCog } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { Boton } from "@/components/ui/boton";
import { Dialogo } from "@/components/ui/dialogo";
import { MensajeError } from "@/components/ui/mensaje-error";
import { ETIQUETA_ROL, type Rol } from "@/lib/auth/permisos";
import { CLASE_ESTADO, ETIQUETA_ESTADO, urlFotoEmpleado, type EstadoEmpleado } from "@/lib/empleados";
import { crearEmpleado } from "./actions";

export type TarjetaEmpleado = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  rol: Rol;
  especialidad: string | null;
  comision: number;
  estado: EstadoEmpleado;
  reservaWeb: boolean;
  color: string;
  fotoPath: string | null;
  conAcceso: boolean;
  horario: string;
  servicios: number;
};

const FILTROS: { id: Rol | "todos"; nombre: string }[] = [
  { id: "todos", nombre: "Todos" },
  { id: "estilista", nombre: "Profesionales" },
  { id: "recepcion", nombre: "Recepción" },
  { id: "asistente", nombre: "Asistentes" },
  { id: "admin", nombre: "Administración" },
];

export function EquipoEmpleados({ empleados, editable }: { empleados: TarjetaEmpleado[]; editable: boolean }) {
  const [filtro, setFiltro] = useState<Rol | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [nuevo, setNuevo] = useState(false);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter(
      (e) =>
        (filtro === "todos" || e.rol === filtro) &&
        (!q || e.nombre.toLowerCase().includes(q) || (e.especialidad ?? "").toLowerCase().includes(q)),
    );
  }, [empleados, filtro, busqueda]);

  return (
    <div className="space-y-8">
      <Encabezado
        icono={UserCog}
        titulo="Empleados"
        subtitulo="El equipo del salón: horarios, servicios que realiza y comisión."
        accion={
          editable && (
            <button
              type="button"
              onClick={() => setNuevo(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
            >
              <Plus className="h-4 w-4" /> Nuevo empleado
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Empleados" valor={String(empleados.length)} />
        <Indicador etiqueta="Activos" valor={String(empleados.filter((e) => e.estado === "activo").length)} />
        <Indicador etiqueta="Profesionales" valor={String(empleados.filter((e) => e.rol === "estilista").length)} />
        <Indicador etiqueta="En vacaciones" valor={String(empleados.filter((e) => e.estado === "vacaciones").length)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full max-w-xs">
          <span className="sr-only">Buscar empleado</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o especialidad"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm outline-none focus:border-gold"
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filtro === f.id ? "border-ink bg-ink text-ivory" : "border-line bg-surface text-muted hover:text-foreground"
              }`}
            >
              {f.nombre}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visibles.map((e) => (
          <li key={e.id}>
            <Link
              href={`/panel/personal/empleados/${e.id}`}
              className="block h-full rounded-xl border border-line bg-surface p-5 transition hover:border-gold"
            >
              <div className="flex items-start gap-4">
                <Avatar nombre={e.nombre} foto={urlFotoEmpleado(e.fotoPath)} tamano={64} color={e.color} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-display text-xl leading-tight">{e.nombre}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO[e.estado]}`}>
                      {ETIQUETA_ESTADO[e.estado]}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted">{e.especialidad || "Sin especialidad"}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-gold-strong">{ETIQUETA_ROL[e.rol]}</p>
                </div>
              </div>

              <dl className="mt-4 space-y-1.5 text-sm">
                <Dato icono={Clock}>{e.horario}</Dato>
                {e.telefono && <Dato icono={Phone}>{e.telefono}</Dato>}
                {e.email && <Dato icono={Mail}>{e.email}</Dato>}
                <Dato icono={Percent}>
                  Comisión {e.comision}% · {e.servicios} {e.servicios === 1 ? "servicio" : "servicios"}
                </Dato>
              </dl>

              <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                {e.reservaWeb && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-muted">
                    <Globe className="h-3 w-3" /> Reservas web
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-muted">
                  <KeyRound className="h-3 w-3" /> {e.conAcceso ? "Con acceso al sistema" : "Sin acceso al sistema"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {visibles.length === 0 && <p className="py-10 text-center text-sm text-muted">No hay empleados que coincidan.</p>}

      <Dialogo abierto={nuevo} onCerrar={() => setNuevo(false)} titulo="Nuevo empleado" subtitulo="Luego completas su horario, servicios y foto.">
        {nuevo && <FormularioNuevo />}
      </Dialogo>
    </div>
  );
}

function Dato({ icono: Icono, children }: { icono: typeof Clock; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-foreground/80">
      <Icono className="h-3.5 w-3.5 shrink-0 text-muted" />
      <span className="truncate">{children}</span>
    </div>
  );
}

function FormularioNuevo() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();
  const entrada = "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold";
  const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      action={(fd) =>
        iniciar(async () => {
          const r = await crearEmpleado({
            nombre: String(fd.get("nombre") ?? ""),
            apellido: String(fd.get("apellido") ?? ""),
            email: String(fd.get("email") ?? ""),
            telefono: String(fd.get("telefono") ?? ""),
            rol: String(fd.get("rol")) as Rol,
            especialidad: String(fd.get("especialidad") ?? ""),
            comision_pct: Number(fd.get("comision") ?? 0),
            estado: "activo",
            reserva_web: fd.get("reserva_web") === "on",
            color: String(fd.get("color") ?? "#c9a15b"),
          });
          setError(r?.error);
          if (r?.id) router.push(`/panel/personal/empleados/${r.id}`);
        })
      }
    >
      <label className="block">
        <span className={etiqueta}>Nombre</span>
        <input name="nombre" required maxLength={60} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Apellido</span>
        <input name="apellido" maxLength={60} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Rol</span>
        <select name="rol" defaultValue="estilista" className={entrada}>
          {(["estilista", "recepcion", "asistente", "admin"] as Rol[]).map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={etiqueta}>Especialidad</span>
        <input name="especialidad" maxLength={80} placeholder="Barbero, colorista…" className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Teléfono</span>
        <input name="telefono" type="tel" maxLength={30} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Correo</span>
        <input name="email" type="email" maxLength={254} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Comisión (%)</span>
        <input name="comision" type="number" min={0} max={100} step={0.5} defaultValue={30} className={entrada} />
      </label>
      <label className="block">
        <span className={etiqueta}>Color en la agenda</span>
        <input name="color" type="color" defaultValue="#c9a15b" className="h-10 w-full rounded-lg border border-line bg-surface p-1" />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input name="reserva_web" type="checkbox" defaultChecked className="h-4 w-4 accent-[var(--brand-gold)]" />
        Recibe reservas desde la web
      </label>
      <div className="sm:col-span-2">
        <MensajeError>{error}</MensajeError>
      </div>
      <div className="sm:col-span-2">
        <Boton type="submit" cargando={pendiente}>
          Crear y continuar
        </Boton>
      </div>
    </form>
  );
}
