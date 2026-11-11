import type { Metadata } from "next";
import { MyAppointments } from "@/components/booking/MyAppointments";
import { PageHeader } from "@/components/public/Sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mis citas", robots: { index: false, follow: false } };

export default async function MisCitasPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Área de cliente" title="Mis citas">
        <p>Consulta, cambia o cancela tus citas sin llamar por teléfono.</p>
      </PageHeader>
      <section className="py-12 sm:py-16">
        <div className="container-x max-w-3xl">
          <MyAppointments linkError={error === "enlace"} />
        </div>
      </section>
    </>
  );
}
