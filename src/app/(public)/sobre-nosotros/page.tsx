import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/public/Sections";
import { getPublicInfo } from "@/services/publicInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sobre nosotros · Peluquería de caballeros Morén",
  description: "Conoce Morén Peluquería de Caballeros, tu barbería de confianza en Pablo Gargallo, Zaragoza.",
  alternates: { canonical: "/sobre-nosotros" },
};

export default async function SobrePage() {
  const { settings } = await getPublicInfo();
  const paragraphs = (settings.about || settings.intro).split(/\n{2,}/).filter(Boolean);
  return (
    <>
      <PageHeader eyebrow="Sobre nosotros" title="Tu estilo, en buenas manos" />
      <section className="py-16">
        <div className="container-x max-w-3xl space-y-6 text-lg leading-relaxed text-bone/80">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          <Link href="/reservar" className="btn-gold mt-6">Reservar cita</Link>
        </div>
      </section>
    </>
  );
}
