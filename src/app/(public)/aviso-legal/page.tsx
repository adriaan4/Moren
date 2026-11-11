import type { Metadata } from "next";
import { PageHeader } from "@/components/public/Sections";
import { getSettings } from "@/repositories/settingsRepo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aviso legal", robots: { index: true, follow: true } };

export default async function AvisoLegalPage() {
  const s = await getSettings();
  return (
    <>
      <PageHeader eyebrow="Legal" title="Aviso legal" />
      <section className="py-14">
        <article className="container-x max-w-3xl space-y-8 text-[15px] leading-relaxed text-bone/80 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-bone">
          <p className="border border-gold/40 bg-gold/5 p-4 text-sm text-gold-light">
            Texto base conforme a la Ley 34/2002 (LSSI-CE). El titular debe completar los datos entre corchetes y revisarlo con su asesor legal.
          </p>
          <div><h2>Datos identificativos</h2>
            <p>Titular: [NOMBRE O RAZÓN SOCIAL] · NIF/CIF: [NIF/CIF] · Domicilio: {s.address} · Teléfono: {s.phone}{s.email ? ` · Correo: ${s.email}` : ""} · Datos de inscripción registral (si procede): [DATOS].</p></div>
          <div><h2>Objeto</h2>
            <p>Este sitio web ofrece información sobre los servicios de {s.businessName} y permite reservar citas online. El acceso implica la aceptación de estas condiciones.</p></div>
          <div><h2>Reservas y precios</h2>
            <p>Los precios mostrados son los vigentes en el momento de consultar la web. Cada reserva conserva el precio y la duración acordados en el momento de reservar. Las condiciones para modificar o cancelar una cita online son las indicadas en el área “Mis citas”.</p></div>
          <div><h2>Propiedad intelectual</h2>
            <p>Los textos, imágenes, logotipos y el diseño de esta web son propiedad del titular o se usan con la debida autorización. Queda prohibida su reproducción sin permiso.</p></div>
          <div><h2>Responsabilidad</h2>
            <p>El titular no se responsabiliza de interrupciones puntuales del servicio por causas técnicas ni del uso indebido de la web por terceros.</p></div>
          <div><h2>Legislación aplicable</h2>
            <p>Este aviso se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales de Zaragoza, salvo que la normativa de consumidores disponga otro fuero.</p></div>
        </article>
      </section>
    </>
  );
}
