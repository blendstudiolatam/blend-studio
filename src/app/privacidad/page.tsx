import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo tratamos tus datos personales, según la Ley 81 de 2019 de Panamá.",
};

// Texto base preparado para la Ley 81 de 2019 y el Decreto Ejecutivo 285 de 2021.
// Recomendación: que un abogado en Panamá lo revise antes de publicar en producción.
const ACTUALIZADA = "7 de octubre de 2026";

export default async function PrivacidadPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("datos_privacidad").maybeSingle();
  const nombre = data?.nombre_comercial ?? "Blend Studio";
  const responsable = data?.nombre_legal ? `${data.nombre_legal}${data.ruc ? ` (RUC ${data.ruc}${data.dv ? ` DV ${data.dv}` : ""})` : ""}` : nombre;
  const contacto = [data?.email, data?.whatsapp ?? data?.telefono].filter(Boolean).join(" · ");

  return (
    <main className="min-h-dvh bg-background px-5 py-12">
      <article className="mx-auto max-w-2xl space-y-6 text-[15px] leading-relaxed">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <header>
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-strong">{nombre}</p>
          <h1 className="mt-2 font-display text-4xl">Política de privacidad</h1>
          <p className="mt-2 text-sm text-muted">Última actualización: {ACTUALIZADA}</p>
        </header>

        <Seccion titulo="1. Quién es responsable de tus datos">
          <p>
            {responsable}
            {data?.direccion && `, con domicilio en ${data.direccion}`}, es responsable del tratamiento de tus datos personales, conforme a la Ley 81 de
            2019 sobre Protección de Datos Personales de la República de Panamá y su reglamento.
          </p>
          {contacto && <p>Contacto para temas de privacidad: {contacto}.</p>}
        </Seccion>

        <Seccion titulo="2. Qué datos pedimos">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Al reservar en línea:</strong> nombre, apellido, teléfono o WhatsApp y, si quieres, correo y un comentario.
            </li>
            <li>
              <strong>En el salón, solo si los necesitamos para tu servicio:</strong> fecha de nacimiento, documento de identidad, y datos de salud
              relevantes (alergias, condiciones o medicación) para tratamientos estéticos.
            </li>
            <li>
              <strong>Fotografías de antes y después</strong> de tratamientos, para seguir tu avance.
            </li>
          </ul>
          <p>No guardamos datos de tarjetas: los pagos se hacen en el salón o en la página segura del procesador de pagos.</p>
        </Seccion>

        <Seccion titulo="3. Para qué los usamos">
          <ul className="list-disc space-y-1 pl-5">
            <li>Gestionar tus citas: confirmarlas, recordártelas y avisarte de cambios.</li>
            <li>Prestarte el servicio de forma segura y llevar el historial de tus tratamientos.</li>
            <li>Emitir comprobantes y facturas cuando corresponda.</li>
            <li>Enviarte promociones o saludos de cumpleaños, solo si nos autorizas.</li>
          </ul>
        </Seccion>

        <Seccion titulo="4. Datos sensibles y fotografías">
          <p>
            Los datos de salud y las fotografías de tratamientos son datos sensibles. Solo los registramos con tu consentimiento expreso, los guardamos en
            un almacenamiento privado, solo los ve el personal autorizado (administración, recepción y el profesional que te atiende) y queda registro
            de cada consulta. Nunca usamos tus fotos en redes o publicidad sin tu autorización.
          </p>
        </Seccion>

        <Seccion titulo="5. Con quién los compartimos">
          <p>
            No vendemos ni cedemos tus datos. Solo los comparten con nosotros, bajo contrato y con medidas de seguridad, los proveedores que necesitamos
            para operar: alojamiento de la base de datos, mensajería (WhatsApp) y facturación electrónica. Algunos de estos proveedores pueden almacenar
            datos fuera de Panamá, con garantías adecuadas de protección.
          </p>
        </Seccion>

        <Seccion titulo="6. Cuánto tiempo los guardamos">
          <p>
            Mientras seas cliente y, después, el tiempo que exijan las obligaciones legales y fiscales. Puedes pedir que eliminemos tu ficha cuando ya no
            exista una obligación de conservarla.
          </p>
        </Seccion>

        <Seccion titulo="7. Tus derechos (ARCO y portabilidad)">
          <p>
            Puedes pedir en cualquier momento <strong>acceso</strong> a tus datos, su <strong>rectificación</strong>, su <strong>cancelación</strong>{" "}
            (eliminación), <strong>oponerte</strong> a un uso, la <strong>portabilidad</strong> de tus datos y retirar tu consentimiento.
            {contacto ? ` Escríbenos a ${contacto}.` : " Pídelo en el salón."} Respondemos en los plazos que fija la ley. Si no estás conforme, puedes
            acudir a la Autoridad Nacional de Transparencia y Acceso a la Información (ANTAI).
          </p>
        </Seccion>

        <Seccion titulo="8. Seguridad">
          <p>
            Usamos conexiones cifradas, contraseñas con verificación en dos pasos para la administración, permisos por rol y registro de cambios.
            Ningún sistema es infalible, pero trabajamos para proteger tu información.
          </p>
        </Seccion>

        <Seccion titulo="9. Cambios a esta política">
          <p>Si cambiamos esta política, publicaremos la nueva versión en esta página con su fecha de actualización.</p>
        </Seccion>
      </article>
    </main>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-2xl">{titulo}</h2>
      {children}
    </section>
  );
}
