import type { Metadata } from "next";
import { PageHeader } from "@/components/public/Sections";
import { PriceList } from "@/components/public/PriceList";
import { getPublicInfo } from "@/services/publicInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Precios · Peluquería de caballeros en Zaragoza",
  description: "Tarifas de Morén Peluquería de Caballeros en Zaragoza: precios de corte de pelo, barba y otros servicios.",
  alternates: { canonical: "/precios" },
};

export default async function PreciosPage() {
  const { services } = await getPublicInfo();
  return (
    <>
      <PageHeader eyebrow="Tarifas" title="Precios">
        <p>Precios actualizados. Pulsa “Reservar cita” en cualquier servicio para empezar tu reserva con él ya seleccionado.</p>
      </PageHeader>
      <section className="py-16">
        <div className="container-x">
          <PriceList services={services} withImages />
        </div>
      </section>
    </>
  );
}
