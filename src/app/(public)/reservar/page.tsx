import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PageHeader } from "@/components/public/Sections";
import { getPublicInfo } from "@/services/publicInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reservar cita online · Peluquería de caballeros Zaragoza",
  description: "Reserva tu cita en Morén Peluquería de Caballeros, Zaragoza, en menos de un minuto. Elige servicio, día y hora.",
  alternates: { canonical: "/reservar" },
};

export default async function ReservarPage({ searchParams }: { searchParams: Promise<{ servicio?: string }> }) {
  const [{ servicio }, info] = await Promise.all([searchParams, getPublicInfo()]);
  return (
    <>
      <PageHeader eyebrow="Reservas online" title="Reservar cita" />
      <section className="py-12 sm:py-16">
        <div className="container-x max-w-4xl">
          <BookingWizard services={info.services} initialServiceId={servicio} requireApproval={info.settings.requireApproval} />
        </div>
      </section>
    </>
  );
}
