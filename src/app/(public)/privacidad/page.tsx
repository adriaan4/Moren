import type { Metadata } from "next";
import { PageHeader } from "@/components/public/Sections";
import { getSettings } from "@/repositories/settingsRepo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Política de privacidad y cookies", robots: { index: true, follow: true } };

export default async function PrivacidadPage() {
  const s = await getSettings();
  const contact = s.email || s.phone;
  return (
    <>
      <PageHeader eyebrow="Legal" title="Política de privacidad y cookies" />
      <section className="py-14">
        <article className="container-x max-w-3xl space-y-8 text-[15px] leading-relaxed text-bone/80 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-bone [&_li]:ml-5 [&_li]:list-disc">
          <div><h2>1. Responsable del tratamiento</h2>
            <p>Titular: {s.legalName || s.businessName}{s.legalId ? ` · NIF/CIF: ${s.legalId}` : ""} · Domicilio: {s.address} · Teléfono: {s.phone}{s.email ? ` · Correo: ${s.email}` : ""}. Nombre comercial: {s.businessName}.</p></div>
          <div><h2>2. Datos que tratamos</h2>
            <p>Para gestionar tus citas tratamos: nombre, apellidos, teléfono, correo electrónico, datos de la reserva (servicio, fecha, hora, precio acordado) y los comentarios que nos indiques. No solicitamos datos de salud ni datos de pago.</p></div>
          <div><h2>3. Finalidad y base jurídica</h2>
            <ul>
              <li>Gestionar tu reserva, modificarla o cancelarla y comunicarnos contigo sobre ella (art. 6.1.b RGPD: ejecución de la relación solicitada).</li>
              <li>Enviarte confirmaciones, avisos de modificación o cancelación y un recordatorio 24 horas antes de la cita (art. 6.1.b RGPD).</li>
              <li>Gestión administrativa y estadísticas internas de la actividad (interés legítimo, art. 6.1.f RGPD).</li>
              <li>No enviamos publicidad ni boletines comerciales sin tu consentimiento expreso.</li>
            </ul></div>
          <div><h2>4. Conservación</h2>
            <p>Conservamos tus datos mientras mantengas relación con nosotros y, después, durante los plazos legales aplicables. Puedes pedirnos su supresión en cualquier momento.</p></div>
          <div><h2>5. Destinatarios y encargados</h2>
            <p>Utilizamos proveedores tecnológicos que actúan como encargados del tratamiento: alojamiento de la web, base de datos y envío de correo electrónico. No cedemos tus datos a terceros salvo obligación legal.</p></div>
          <div><h2>6. Tus derechos</h2>
            <p>Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {contact} o presentándote en el local. Si consideras que no tratamos tus datos correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).</p></div>
          <div><h2>7. Cookies</h2>
            <p>Esta web utiliza únicamente cookies técnicas estrictamente necesarias (cookie de sesión “moren_session”, que solo se crea cuando accedes a “Mis citas” o al panel privado). No utilizamos cookies analíticas, publicitarias ni de seguimiento, por lo que no se requiere banner de consentimiento. El mapa de Google Maps incrustado en la sección de contacto puede instalar cookies propias de Google cuando se carga; puedes evitarlo abriendo el mapa desde el botón “Cómo llegar”.</p></div>
          <div><h2>8. Seguridad</h2>
            <p>Aplicamos medidas técnicas y organizativas adecuadas: conexiones cifradas (HTTPS), acceso restringido al panel de administración, contraseñas almacenadas con hash seguro y copias de seguridad.</p></div>
        </article>
      </section>
    </>
  );
}
