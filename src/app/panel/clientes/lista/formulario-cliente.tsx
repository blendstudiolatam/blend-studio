"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Boton } from "@/components/ui/boton";
import { MensajeError } from "@/components/ui/mensaje-error";
import { edad, ETIQUETA_GENERO, hoyPanama, type Genero } from "@/lib/clientes";
import { crearCliente, eliminarCliente, guardarCliente, subirFotoCliente, type DatosCliente } from "../actions";
import type { FilaCliente } from "./lista-clientes";

const entrada =
  "block w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-gold disabled:opacity-70";
const etiqueta = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted";

export function FormularioCliente({
  cliente,
  editable,
  puedeEliminar,
  onListo,
}: {
  cliente: FilaCliente | null;
  editable: boolean;
  puedeEliminar: boolean;
  onListo: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const [foto, setFoto] = useState(cliente?.foto ?? null);
  const [nacimiento, setNacimiento] = useState(cliente?.fechaNacimiento ?? "");
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const archivo = useRef<HTMLInputElement>(null);
  const anios = edad(nacimiento || null);

  const enviar = (fd: FormData) =>
    iniciar(async () => {
      const datos: DatosCliente = {
        nombre: String(fd.get("nombre") ?? ""),
        apellido: String(fd.get("apellido") ?? ""),
        telefono: String(fd.get("telefono") ?? ""),
        email: String(fd.get("email") ?? ""),
        fecha_nacimiento: String(fd.get("fecha_nacimiento") ?? ""),
        genero: String(fd.get("genero") ?? "") as Genero | "",
        documento: String(fd.get("documento") ?? ""),
        direccion: String(fd.get("direccion") ?? ""),
        notas: String(fd.get("notas") ?? ""),
        recordatorios_whatsapp: fd.get("recordatorios_whatsapp") === "on",
        permitir_fotos: fd.get("permitir_fotos") === "on",
        activo: cliente ? fd.get("activo") === "on" : true,
      };
      const r = cliente ? await guardarCliente(cliente.id, datos) : await crearCliente(datos);
      if (r?.error) return setError(r.error);
      router.refresh();
      onListo();
    });

  return (
    <form action={enviar} className="space-y-6">
      {cliente && (
        <div className="flex items-center gap-4">
          <Avatar nombre={`${cliente.nombre} ${cliente.apellido}`} foto={foto} tamano={72} privada />
          {editable && (
            <>
              <input
                ref={archivo}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const datos = new FormData();
                  datos.set("foto", f);
                  iniciar(async () => {
                    const r = await subirFotoCliente(cliente.id, datos);
                    setError(r?.error);
                    if (r?.ok) {
                      setFoto(URL.createObjectURL(f));
                      setAviso("Foto actualizada.");
                      router.refresh();
                    }
                  });
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={pendiente}
                onClick={() => archivo.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-xs text-muted hover:border-gold hover:text-foreground"
              >
                <Camera className="h-4 w-4" /> {foto ? "Cambiar foto" : "Subir foto"}
              </button>
            </>
          )}
        </div>
      )}

      <fieldset disabled={!editable || pendiente} className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={etiqueta}>Nombre</span>
          <input name="nombre" required maxLength={60} defaultValue={cliente?.nombre} className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Apellidos</span>
          <input name="apellido" maxLength={60} defaultValue={cliente?.apellido} className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Teléfono / WhatsApp</span>
          <input name="telefono" type="tel" maxLength={30} placeholder="+507 6000-0000" defaultValue={cliente?.telefono ?? ""} className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Correo</span>
          <input name="email" type="email" maxLength={254} defaultValue={cliente?.email ?? ""} className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Fecha de nacimiento{anios !== null && ` · ${anios} años`}</span>
          <input
            name="fecha_nacimiento"
            type="date"
            min="1900-01-01"
            max={hoyPanama()}
            value={nacimiento}
            onChange={(e) => setNacimiento(e.target.value)}
            className={entrada}
          />
        </label>
        <label className="block">
          <span className={etiqueta}>Género</span>
          <select name="genero" defaultValue={cliente?.genero ?? ""} className={entrada}>
            <option value="">Sin indicar</option>
            {(Object.keys(ETIQUETA_GENERO) as Genero[]).map((g) => (
              <option key={g} value={g}>
                {ETIQUETA_GENERO[g]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={etiqueta}>Cédula o pasaporte</span>
          <input name="documento" maxLength={30} defaultValue={cliente?.documento ?? ""} className={entrada} />
        </label>
        <label className="block">
          <span className={etiqueta}>Dirección</span>
          <input name="direccion" maxLength={200} defaultValue={cliente?.direccion ?? ""} className={entrada} />
        </label>
        <label className="block sm:col-span-2">
          <span className={etiqueta}>Notas</span>
          <textarea
            name="notas"
            rows={3}
            maxLength={1000}
            defaultValue={cliente?.notas ?? ""}
            placeholder="Preferencias, cómo le gusta su servicio…"
            className={entrada}
          />
        </label>

        <div className="space-y-2.5 text-sm sm:col-span-2">
          <label className="flex items-center gap-2">
            <input
              name="recordatorios_whatsapp"
              type="checkbox"
              defaultChecked={cliente?.recordatoriosWhatsapp ?? true}
              className="h-4 w-4 accent-[var(--brand-gold)]"
            />
            Recibe recordatorios por WhatsApp
          </label>
          <label className="flex items-center gap-2">
            <input
              name="permitir_fotos"
              type="checkbox"
              defaultChecked={cliente?.permitirFotos ?? false}
              className="h-4 w-4 accent-[var(--brand-gold)]"
            />
            Permite usar sus fotos (redes y publicidad)
          </label>
          {cliente && (
            <label className="flex items-center gap-2">
              <input name="activo" type="checkbox" defaultChecked={cliente.activo} className="h-4 w-4 accent-[var(--brand-gold)]" />
              Cliente activo
            </label>
          )}
        </div>
      </fieldset>

      <MensajeError>{error}</MensajeError>
      {aviso && !error && <p className="text-sm text-emerald-700">{aviso}</p>}

      {editable ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Boton type="submit" cargando={pendiente} className="sm:w-auto">
            {cliente ? "Guardar cambios" : "Crear cliente"}
          </Boton>
          {cliente && puedeEliminar && (
            <div className="flex items-center gap-2 text-sm">
              {confirmarBorrado ? (
                <>
                  <span className="text-muted">¿Borrar la ficha para siempre?</span>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await eliminarCliente(cliente.id);
                        if (r?.error) return setError(r.error);
                        router.refresh();
                        onListo();
                      })
                    }
                    className="rounded-lg bg-red-700 px-3 py-1.5 text-xs text-white hover:bg-red-800"
                  >
                    Sí, borrar
                  </button>
                  <button type="button" onClick={() => setConfirmarBorrado(false)} className="text-xs text-muted hover:underline">
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarBorrado(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-red-700 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar cliente
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">Solo lectura: tu rol puede ver los clientes, pero no editarlos.</p>
      )}
    </form>
  );
}
