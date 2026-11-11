import type { Metadata } from "next";
import { ContactBlock, PageHeader } from "@/components/public/Sections";
import { getPublicInfo } from "@/services/publicInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contacto y ubicación · Peluquería en Pablo Gargallo, Zaragoza",
  description: "Avenida de Pablo Gargallo 107, 50003 Zaragoza. Teléfono 976 44 64 54. Horario de apertura y cómo llegar.",
  alternates: { canonical: "/contacto" },
};

export default async function ContactoPage() {
  const { settings, weekly, todayDow } = await getPublicInfo();
  return (
    <>
      <PageHeader eyebrow="Contacto" title="Visítanos o llámanos" />
      <section className="py-16">
        <div className="container-x">
          <ContactBlock settings={settings} weekly={weekly} todayDow={todayDow} />
        </div>
      </section>
    </>
  );
}
