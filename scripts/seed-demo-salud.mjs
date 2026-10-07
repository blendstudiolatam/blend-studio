// Historial médico y documentos de prueba (solo proyecto de desarrollo):
// - historial con consentimiento para algunos clientes, uno sin consentimiento;
// - fotos de antes / avance / después de los 4 tratamientos;
// - un consentimiento en PDF (documento ficticio) para cada cliente con tratamiento.
// Uso: npm run seed:salud   (requiere antes seed:clientes; se puede repetir)
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
if (!url || !secreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const sb = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
const { clientes, tratamientos } = JSON.parse(readFileSync("supabase/seed-demo/personas.json", "utf8"));

const HISTORIAL = {
  c01: {
    datos: { condiciones: "Acné inflamatorio moderado", tipo_sangre: "O+", peso_kg: 58, altura_cm: 163, presion: "110/70" },
    meds: [{ medicamento: "Isotretinoína", dosis: "20 mg diarios", desde: "2026-07-15" }],
  },
  c02: {
    datos: { condiciones: "Alopecia androgenética inicial", tipo_sangre: "A+", peso_kg: 82, altura_cm: 176, presion: "125/80" },
    meds: [{ medicamento: "Minoxidil 5 % tópico", dosis: "1 ml dos veces al día", desde: "2026-05-02" }],
  },
  c03: {
    datos: { alergias: "Hidroquinona (irritación)", condiciones: "Melasma", tipo_sangre: "B+", observaciones: "Usar protector solar FPS 50 después de cada sesión." },
    meds: [],
  },
  c04: {
    datos: { alergias: "Formol", condiciones: "Hipertensión controlada", tipo_sangre: "O-", peso_kg: 66, altura_cm: 158, presion: "130/85" },
    meds: [{ medicamento: "Losartán", dosis: "50 mg diarios", desde: "2024-02-10" }],
  },
  c08: {
    datos: { alergias: "Látex", condiciones: "Embarazo (segundo trimestre)", observaciones: "Evitar químicos fuertes y retinoides." },
    meds: [{ medicamento: "Ácido fólico", dosis: "5 mg diarios", desde: "2026-06-01" }],
  },
  c06: null, // dijo que no: queda la constancia sin datos
};

const ETAPA = { antes: "Antes", avance: "Avance", despues: "Después" };

/** PDF mínimo de una página con texto (documento ficticio de prueba). */
function pdf(lineas) {
  const esc = (t) => t.replace(/[\\()]/g, (c) => `\\${c}`);
  const flujo = ["BT", "/F1 16 Tf", "72 760 Td", "20 TL", ...lineas.map((l, i) => `${i ? "T* " : ""}(${esc(l)}) Tj`), "ET"].join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(flujo, "latin1")} >>\nstream\n${flujo}\nendstream`,
  ];
  let salida = "%PDF-1.4\n";
  const posiciones = [];
  objetos.forEach((o, i) => {
    posiciones.push(Buffer.byteLength(salida, "latin1"));
    salida += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(salida, "latin1");
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  salida += posiciones.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("");
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(salida, "latin1");
}

async function idCliente(clave) {
  const c = clientes.find((x) => x.id === clave);
  const { data } = await sb.from("clientes").select("id").eq("telefono", c.telefono).single();
  return { ...c, uuid: data.id };
}

// Historial médico
for (const [clave, h] of Object.entries(HISTORIAL)) {
  const c = await idCliente(clave);
  const base = { cliente_id: c.uuid, consentimiento: Boolean(h), consentimiento_at: h ? new Date().toISOString() : null };
  const { error } = await sb.from("historial_medico").upsert(
    { ...base, alergias: null, condiciones: null, observaciones: null, tipo_sangre: null, peso_kg: null, altura_cm: null, presion: null, ...(h?.datos ?? {}) },
    { onConflict: "cliente_id" },
  );
  if (error) throw error;
  await sb.from("medicamentos_cliente").delete().eq("cliente_id", c.uuid);
  if (h?.meds.length) {
    const { error: e2 } = await sb.from("medicamentos_cliente").insert(h.meds.map((m, i) => ({ ...m, cliente_id: c.uuid, orden: i })));
    if (e2) throw e2;
  }
  console.log(`historial: ${c.nombre} ${c.apellido}${h ? "" : " (sin consentimiento)"}`);
}

// Documentos
async function documento(clienteUuid, categoria, nombre, tipo, contenido) {
  const id = randomUUID();
  const path = `${clienteUuid}/${id}.${tipo === "application/pdf" ? "pdf" : "webp"}`;
  const { error: e1 } = await sb.storage.from("documentos").upload(path, contenido, { contentType: tipo, upsert: true });
  if (e1) throw e1;
  const { error: e2 } = await sb.from("documentos_cliente").insert({ id, cliente_id: clienteUuid, categoria, nombre, path, tipo, tamano: contenido.length });
  if (e2) throw e2;
}

for (const t of tratamientos) {
  const c = await idCliente(t.cliente);
  // Limpia los documentos anteriores de este cliente (solo datos de prueba).
  const { data: previos } = await sb.from("documentos_cliente").select("path").eq("cliente_id", c.uuid);
  if (previos?.length) {
    await sb.storage.from("documentos").remove(previos.map((p) => p.path));
    await sb.from("documentos_cliente").delete().eq("cliente_id", c.uuid);
  }

  await documento(
    c.uuid,
    "consentimiento",
    `Consentimiento informado — ${t.procedimiento}`,
    "application/pdf",
    pdf([
      "Blend Studio - Consentimiento informado",
      "DOCUMENTO FICTICIO DE PRUEBA",
      "",
      `Cliente: ${c.nombre} ${c.apellido}`,
      `Procedimiento: ${t.procedimiento}`,
      `Sesiones: ${t.sesiones}`,
      "",
      "Autorizo el procedimiento y el registro de mis datos de salud",
      "y fotografias de avance (Ley 81 de 2019).",
    ]),
  );

  const fotos = ["1-antes", "2-avance", "3-avance", "4-despues"];
  for (const [i, f] of fotos.entries()) {
    const etapa = f.split("-")[1];
    await documento(
      c.uuid,
      "antes_despues",
      `${ETAPA[etapa]}${etapa === "avance" ? ` ${i}` : ""} — ${t.procedimiento}`,
      "image/webp",
      readFileSync(`supabase/seed-demo/fotos/tratamientos/${t.clave}-${f}.webp`),
    );
  }
  console.log(`documentos: ${c.nombre} ${c.apellido} — 1 consentimiento y ${fotos.length} fotos`);
}
