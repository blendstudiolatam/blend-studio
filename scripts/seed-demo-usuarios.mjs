// Crea los usuarios de prueba de los empleados ficticios (solo proyecto de DESARROLLO).
// Uso: npm run seed:usuarios
// Las contraseñas quedan en supabase/seed-demo/credenciales-prueba.local.txt (no se sube a GitHub).
import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;
if (!url || !secreta) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}

const DOMINIO = "prueba.blendstudio.test"; // .test es un dominio reservado: estos correos no existen
const SUCURSAL_SLUG = "blend-studio-1";

const sb = createClient(url, secreta, { auth: { persistSession: false, autoRefreshToken: false } });
const { empleados } = JSON.parse(readFileSync("supabase/seed-demo/personas.json", "utf8"));

const sinAcentos = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const contrasena = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 16 }, () => c[randomInt(c.length)]).join("");
};

const { data: sucursal, error: errSuc } = await sb
  .from("sucursales").select("id, nombre").eq("slug", SUCURSAL_SLUG).single();
if (errSuc) throw new Error(`No se encontró la sucursal ${SUCURSAL_SLUG}`);

const lineas = [
  "USUARIOS DE PRUEBA — Blend Studio (solo desarrollo, no compartir)",
  `Sucursal: ${sucursal.nombre}`,
  `Entrar en: http://localhost:3000/entrar`,
  "",
];

for (const e of empleados.filter((x) => x.acceso)) {
  const nombre = `${e.nombre} ${e.apellido}`;
  const email = `${sinAcentos(e.nombre.split(" ")[0])}.${sinAcentos(e.apellido)}@${DOMINIO}`;
  const password = contrasena();

  let { data: perfil } = await sb.from("perfiles").select("id").eq("email", email).maybeSingle();
  if (perfil) {
    const { error } = await sb.auth.admin.updateUserById(perfil.id, { password });
    if (error) throw error;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo: nombre },
    });
    if (error) throw error;
    perfil = { id: data.user.id };
  }

  const { error: errAcc } = await sb
    .from("accesos")
    .upsert(
      { usuario_id: perfil.id, sucursal_id: sucursal.id, rol: e.rol },
      { onConflict: "usuario_id,sucursal_id", ignoreDuplicates: true },
    );
  if (errAcc) throw errAcc;

  lineas.push(`${nombre} — ${e.especialidad} — rol: ${e.rol}`);
  lineas.push(`  correo:     ${email}`);
  lineas.push(`  contraseña: ${password}`);
  if (e.rol === "admin") lineas.push("  (admin: al entrar pedirá configurar la verificación en dos pasos)");
  lineas.push("");
  console.log("ok:", nombre, `(${e.rol})`);
}

writeFileSync("supabase/seed-demo/credenciales-prueba.local.txt", lineas.join("\n"));
console.log("Credenciales guardadas en supabase/seed-demo/credenciales-prueba.local.txt");
