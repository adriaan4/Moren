import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/public/Logo";
import { LocalBusinessJsonLd } from "@/components/public/JsonLd";
import { PriceList } from "@/components/public/PriceList";
import { ContactBlock, Gallery, Reviews, SectionTitle } from "@/components/public/Sections";
import { getPublicInfo } from "@/services/publicInfo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Peluquería de caballeros en Zaragoza · Morén – Reserva tu cita online" },
  description: "Morén Peluquería de Caballeros en Avenida de Pablo Gargallo 107, Zaragoza. Corte de pelo y barba para hombre. Reserva online sin llamar.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const { settings, weekly, services, todayDow } = await getPublicInfo();
  const featured = services.slice(0, 5);

  return (
    <>
      <LocalBusinessJsonLd settings={settings} weekly={weekly} />

      {/* HERO */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
        {settings.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.heroImageUrl} alt="Interior de Morén Peluquería de Caballeros" className="absolute inset-0 -z-20 h-full w-full object-cover" fetchPriority="high" />
        ) : (
          <div className="stripes absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_70%_20%,#2a2214_0%,#0a0a0a_60%)]" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/40" />

        <div className="container-x pb-24 pt-32 text-center">
          <div className="animate-fade-up">
            <Logo size="lg" />
          </div>
          <h1 className="mx-auto mt-10 max-w-3xl animate-fade-up font-display text-3xl italic text-bone [animation-delay:.15s] sm:text-5xl">
            {settings.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-xl animate-fade-up text-sm leading-relaxed text-bone/70 [animation-delay:.25s] sm:text-base">
            Peluquería de caballeros en Zaragoza · Avenida de Pablo Gargallo 107
          </p>
          <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:.35s] sm:flex-row">
            <Link href="/reservar" className="btn-gold w-full sm:w-auto sm:px-12">Reservar cita</Link>
            <Link href="/precios" className="btn-ghost w-full sm:w-auto">Ver precios</Link>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-6 hidden justify-center lg:flex" aria-hidden>
          <span className="h-12 w-px bg-gradient-to-b from-gold to-transparent" />
        </div>
      </section>

      {/* PRESENTACIÓN */}
      <section className="py-20 sm:py-28">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <SectionTitle eyebrow="La peluquería" title="Oficio, cercanía y atención al detalle" />
          <div className="space-y-5 text-lg leading-relaxed text-bone/80">
            <p>{settings.intro}</p>
            <Link href="/sobre-nosotros" className="inline-block text-sm font-semibold uppercase tracking-[0.2em] text-gold hover:text-gold-light">
              Conócenos →
            </Link>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section className="border-y border-steel bg-coal py-20 sm:py-28">
        <div className="container-x">
          <SectionTitle eyebrow="Servicios y precios" title="Lo que hacemos" />
          <PriceList services={featured} />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/precios" className="btn-outline">Todos los precios</Link>
            <Link href="/servicios" className="btn-ghost">Ver servicios</Link>
          </div>
        </div>
      </section>

      {/* GALERÍA */}
      <section className="py-20 sm:py-28">
        <div className="container-x">
          <SectionTitle eyebrow="Galería" title="Nuestro trabajo" />
          <Gallery images={settings.gallery.slice(0, 6)} name={settings.businessName} />
          {settings.gallery.length > 6 && (
            <Link href="/galeria" className="btn-ghost mt-8">Ver toda la galería</Link>
          )}
        </div>
      </section>

      {/* OPINIONES (solo si el propietario ha añadido opiniones reales) */}
      {settings.reviews.length > 0 && (
        <section className="border-y border-steel bg-coal py-20 sm:py-28">
          <div className="container-x">
            <SectionTitle eyebrow="Opiniones" title="Lo que dicen nuestros clientes" />
            <Reviews reviews={settings.reviews} />
            <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-8">Ver más opiniones en Google</a>
          </div>
        </section>
      )}

      {/* CONTACTO */}
      <section className="py-20 sm:py-28">
        <div className="container-x">
          <SectionTitle eyebrow="Visítanos" title="Dónde encontrarnos" />
          <ContactBlock settings={settings} weekly={weekly} todayDow={todayDow} />
        </div>
      </section>
    </>
  );
}
