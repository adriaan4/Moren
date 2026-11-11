import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/public/Sections";
import { durationLabel } from "@/lib/format";
import { getPublicInfo } from "@/services/publicInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Servicios de peluquería y barbería en Zaragoza",
  description: "Servicios de peluquería de caballeros en Zaragoza: corte de pelo, barba y más. Reserva online en Morén.",
  alternates: { canonical: "/servicios" },
};

export default async function ServiciosPage() {
  const { services } = await getPublicInfo();
  return (
    <>
      <PageHeader eyebrow="Servicios" title="Servicios de peluquería masculina">
        <p>Cada servicio se realiza con calma y a tu medida. Elige el que necesitas y reserva tu hora online.</p>
      </PageHeader>
      <section className="py-16">
        <div className="container-x">
          {services.length === 0 ? (
            <p className="border border-dashed border-steel p-8 text-center text-ash">Los servicios se publicarán muy pronto.</p>
          ) : (
            <ul className="grid gap-5 md:grid-cols-2">
              {services.map((s) => (
                <li key={s.id} className="card group flex flex-col overflow-hidden transition hover:border-gold/60">
                  {s.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.imageUrl} alt={s.name} loading="lazy" className="aspect-[16/9] w-full object-cover grayscale transition duration-700 group-hover:grayscale-0" />
                  )}
                  <div className="flex flex-1 flex-col gap-3 p-6">
                    <h2 className="font-display text-2xl">{s.name}</h2>
                    {s.description && <p className="flex-1 text-sm leading-relaxed text-bone/70">{s.description}</p>}
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <span className="text-xs uppercase tracking-widest text-ash">{durationLabel(s.durationMin)}</span>
                      <Link href={`/reservar?servicio=${s.id}`} className="btn-outline btn-sm">Reservar cita</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
