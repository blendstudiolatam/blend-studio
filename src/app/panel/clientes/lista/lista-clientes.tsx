"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  List,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Upload,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Encabezado, Indicador } from "@/components/panel/encabezado";
import { Avatar } from "@/components/ui/avatar";
import { Dialogo } from "@/components/ui/dialogo";
import {
  CLASE_ESTADO_CLIENTE,
  codigoCliente,
  edad,
  enlaceWhatsApp,
  estadoCliente,
  ETIQUETA_ESTADO_CLIENTE,
  type EstadoCliente,
  type Genero,
} from "@/lib/clientes";
import { FormularioCliente } from "./formulario-cliente";
import { ImportarClientes } from "./importar-clientes";

export type FilaCliente = {
  id: string;
  codigo: number;
  nombre: string;
  apellido: string;
  fechaNacimiento: string | null;
  genero: Genero | null;
  documento: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  notas: string | null;
  recordatoriosWhatsapp: boolean;
  permitirFotos: boolean;
  foto: string | null;
  activo: boolean;
  creado: string;
  planesActivos?: number;
  sesionesCompletadas?: number;
};

type Filtro = { texto: string; estado: EstadoCliente | "todos"; pagina: number; porPagina: number; encontrados: number };

const PESTANAS: { id: EstadoCliente | "todos"; nombre: string }[] = [
  { id: "todos", nombre: "Todos" },
  { id: "activo", nombre: "Activos" },
  { id: "nuevo", nombre: "Nuevos" },
  { id: "inactivo", nombre: "Inactivos" },
];

const boton =
  "inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-xs uppercase tracking-[0.14em] text-foreground hover:border-gold";

export function ListaClientes({
  clientes,
  indicadores,
  filtro,
  editable,
}: {
  clientes: FilaCliente[];
  indicadores: { total: number; activos: number; nuevos: number; planes: number };
  filtro: Filtro;
  editable: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [cargando, iniciar] = useTransition();
  const [busqueda, setBusqueda] = useState(filtro.texto);
  const [vista, setVista] = useState<"tabla" | "tarjetas">("tabla");
  const [nuevo, setNuevo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [exportar, setExportar] = useState(false);
  const ultimaBusqueda = useRef(filtro.texto);

  const ir = (cambios: Partial<Pick<Filtro, "texto" | "estado" | "pagina">>) => {
    const f = { ...filtro, ...cambios };
    const p = new URLSearchParams();
    if (f.texto) p.set("q", f.texto);
    if (f.estado !== "todos") p.set("estado", f.estado);
    if (f.pagina > 1) p.set("pagina", String(f.pagina));
    iniciar(() => router.replace(p.size ? `${pathname}?${p}` : pathname, { scroll: false }));
  };

  // Busca mientras se escribe (con una pequeña pausa).
  useEffect(() => {
    if (busqueda === ultimaBusqueda.current) return;
    const t = setTimeout(() => {
      ultimaBusqueda.current = busqueda;
      ir({ texto: busqueda.trim(), pagina: 1 });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  const paginas = Math.max(1, Math.ceil(filtro.encontrados / filtro.porPagina));
  const abrir = (c: FilaCliente) => router.push(`/panel/clientes/lista/${c.id}`);

  return (
    <div className="space-y-8">
      <Encabezado
        icono={Users}
        titulo="Clientes"
        subtitulo="Una sola ficha por cliente, compartida entre todas las sucursales."
        accion={
          editable && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setImportando(true)} className={boton}>
                <Upload className="h-4 w-4" /> Importar
              </button>
              <div className="relative">
                <button type="button" onClick={() => setExportar((v) => !v)} className={boton} aria-expanded={exportar}>
                  <Download className="h-4 w-4" /> Exportar
                </button>
                {exportar && (
                  <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-surface text-sm shadow-lg">
                    <a href="/panel/clientes/exportar?formato=xlsx" download onClick={() => setExportar(false)} className="block px-4 py-2.5 hover:bg-background">
                      Excel (.xlsx)
                    </a>
                    <a href="/panel/clientes/exportar?formato=csv" download onClick={() => setExportar(false)} className="block px-4 py-2.5 hover:bg-background">
                      CSV
                    </a>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setNuevo(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory hover:bg-ink/85"
              >
                <Plus className="h-4 w-4" /> Nuevo cliente
              </button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador etiqueta="Total de clientes" valor={String(indicadores.total)} />
        <Indicador etiqueta="Activos" valor={String(indicadores.activos)} />
        <Indicador etiqueta="Nuevos" valor={String(indicadores.nuevos)} detalle="Últimos 30 días" />
        <Indicador etiqueta="Planes activos" valor={String(indicadores.planes)} detalle="Tratamientos en curso" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Buscar cliente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            maxLength={60}
            placeholder="Nombre, código (C-0001), teléfono o correo"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-4 text-sm outline-none focus:border-gold"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PESTANAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => ir({ estado: p.id, pagina: 1 })}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  filtro.estado === p.id ? "border-ink bg-ink text-ivory" : "border-line bg-surface text-muted hover:text-foreground"
                }`}
              >
                {p.nombre}
              </button>
            ))}
          </div>
          <div className="flex overflow-hidden rounded-lg border border-line" role="group" aria-label="Vista">
            {(
              [
                ["tabla", List, "Tabla"],
                ["tarjetas", LayoutGrid, "Tarjetas"],
              ] as const
            ).map(([id, Icono, nombre]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVista(id)}
                aria-pressed={vista === id}
                title={nombre}
                className={`p-2 ${vista === id ? "bg-ink text-ivory" : "bg-surface text-muted hover:text-foreground"}`}
              >
                <Icono className="h-4 w-4" />
                <span className="sr-only">{nombre}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`transition-opacity ${cargando ? "opacity-50" : ""}`}>
        {clientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">
            {filtro.texto || filtro.estado !== "todos" ? "No hay clientes que coincidan." : "Aún no hay clientes registrados."}
          </p>
        ) : vista === "tabla" ? (
          <Tabla clientes={clientes} onAbrir={abrir} />
        ) : (
          <Tarjetas clientes={clientes} onAbrir={abrir} />
        )}
      </div>

      {paginas > 1 && (
        <nav className="flex items-center justify-between text-sm text-muted" aria-label="Páginas">
          <span>
            {filtro.encontrados} clientes · página {filtro.pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filtro.pagina <= 1}
              onClick={() => ir({ pagina: filtro.pagina - 1 })}
              className="rounded-lg border border-line bg-surface p-2 disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={filtro.pagina >= paginas}
              onClick={() => ir({ pagina: filtro.pagina + 1 })}
              className="rounded-lg border border-line bg-surface p-2 disabled:opacity-40"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}

      <Dialogo
        abierto={nuevo}
        onCerrar={() => setNuevo(false)}
        titulo="Nuevo cliente"
        subtitulo="Solo el nombre es obligatorio. Luego sigues en su ficha."
        ancho="max-w-2xl"
      >
        {nuevo && <FormularioCliente cliente={null} editable={editable} puedeEliminar={false} />}
      </Dialogo>

      <Dialogo
        abierto={importando}
        onCerrar={() => setImportando(false)}
        titulo="Importar clientes"
        subtitulo="Desde un Excel (.xlsx) o CSV. Los repetidos no se duplican."
        ancho="max-w-xl"
      >
        {importando && <ImportarClientes onListo={() => setImportando(false)} />}
      </Dialogo>
    </div>
  );
}

function Identidad({ c, tamano = 40 }: { c: FilaCliente; tamano?: number }) {
  const anios = edad(c.fechaNacimiento);
  const nombre = `${c.nombre} ${c.apellido}`.trim();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar nombre={nombre} foto={c.foto} tamano={tamano} privada />
      <div className="min-w-0">
        <p className="truncate font-medium">{nombre}</p>
        <p className="text-xs text-muted">
          {codigoCliente(c.codigo)}
          {anios !== null && ` · ${anios} años`}
          {c.genero && ` · ${c.genero}`}
        </p>
      </div>
    </div>
  );
}

function Estado({ c }: { c: FilaCliente }) {
  const e = estadoCliente(c.activo, c.creado);
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${CLASE_ESTADO_CLIENTE[e]}`}>
      {ETIQUETA_ESTADO_CLIENTE[e]}
    </span>
  );
}

function WhatsApp({ telefono }: { telefono: string | null }) {
  const enlace = enlaceWhatsApp(telefono);
  if (!enlace) return null;
  return (
    <a
      href={enlace}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="rounded-md p-1.5 text-muted hover:bg-background hover:text-emerald-700"
      title="Escribir por WhatsApp"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="sr-only">WhatsApp</span>
    </a>
  );
}

function Tabla({ clientes, onAbrir }: { clientes: FilaCliente[]; onAbrir: (c: FilaCliente) => void }) {
  const th = "px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted";
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="border-b border-line">
          <tr>
            <th className={th}>Cliente</th>
            <th className={th}>Contacto</th>
            <th className={th}>Última visita</th>
            <th className={`${th} text-right`}>Planes</th>
            <th className={`${th} text-right`}>Sesiones</th>
            <th className={`${th} text-right`}>Total gastado</th>
            <th className={th}>Estado</th>
            <th className={th}>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {clientes.map((c) => (
            <tr key={c.id} onClick={() => onAbrir(c)} className="cursor-pointer hover:bg-background/60">
              <td className="px-4 py-3">
                <Identidad c={c} />
              </td>
              <td className="px-4 py-3 text-xs">
                <p>{c.telefono ?? "—"}</p>
                {c.email && <p className="max-w-[220px] truncate text-muted">{c.email}</p>}
              </td>
              {/* Última visita y total gastado se llenan con Agenda y Ventas. */}
              <td className="px-4 py-3 text-muted">—</td>
              <td className="px-4 py-3 text-right">{c.planesActivos || <span className="text-muted">—</span>}</td>
              <td className="px-4 py-3 text-right">{c.sesionesCompletadas || <span className="text-muted">—</span>}</td>
              <td className="px-4 py-3 text-right text-muted">—</td>
              <td className="px-4 py-3">
                <Estado c={c} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <WhatsApp telefono={c.telefono} />
                  <button type="button" className="rounded-md px-2 py-1 text-xs text-gold-strong hover:underline">
                    Ver
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tarjetas({ clientes, onAbrir }: { clientes: FilaCliente[]; onAbrir: (c: FilaCliente) => void }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clientes.map((c) => (
        <li key={c.id}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onAbrir(c)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onAbrir(c)}
            className="h-full cursor-pointer rounded-xl border border-line bg-surface p-5 transition hover:border-gold"
          >
            <div className="flex items-start justify-between gap-2">
              <Identidad c={c} tamano={52} />
              <Estado c={c} />
            </div>
            <dl className="mt-4 space-y-1.5 text-sm text-foreground/80">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="flex-1 truncate">{c.telefono ?? "Sin teléfono"}</span>
                <WhatsApp telefono={c.telefono} />
              </div>
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
            </dl>
          </div>
        </li>
      ))}
    </ul>
  );
}
