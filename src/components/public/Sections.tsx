import Link from "next/link";
import { IconClock, IconMail, IconPhone, IconPin, IconStar } from "@/components/ui/Icons";
import { HoursTable } from "./HoursTable";
import { telHref } from "@/lib/format";
import type { Review, Settings, WeeklySchedule } from "@/types";

type PublicSettings = Omit<Settings, "ownerNotifyEmail">;

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="stripes border-b border-steel pb-14 pt-32 lg:pt-40">
      <div className="container-x animate-fade-up">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl sm:text-6xl">{title}</h1>
        <div className="gold-rule mt-6" />
        {children && <div className="mt-6 max-w-2xl text-bone/75">{children}</div>}
      </div>
    </section>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl sm:text-5xl">{title}</h2>
      <div className="gold-rule mt-5" />
      {children && <p className="mt-5 text-bone/70">{children}</p>}
    </div>
  );
}

export function Gallery({ images, name }: { images: string[]; name: string }) {
  if (!images.length) {
    return <p className="border border-dashed border-steel p-8 text-center text-ash">Pronto publicaremos aquí fotografías de nuestro local y de nuestros trabajos.</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
      {images.map((src, i) => (
        <li key={src + i} className={`group relative overflow-hidden bg-graphite ${i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`${name} – fotografía ${i + 1}`} loading="lazy" className="h-full w-full object-cover grayscale transition duration-700 group-hover:scale-105 group-hover:grayscale-0" />
        </li>
      ))}
    </ul>
  );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {reviews.map((r, i) => (
        <li key={i} className="card flex flex-col gap-4 p-6">
          <div className="flex gap-1 text-gold" aria-label={`${r.rating} de 5 estrellas`}>
            {Array.from({ length: Math.round(r.rating) }).map((_, k) => (
              <IconStar key={k} className="h-4 w-4" />
            ))}
          </div>
          <p className="flex-1 text-sm leading-relaxed text-bone/85">“{r.text}”</p>
          <p className="text-xs uppercase tracking-widest text-gold">{r.author}</p>
        </li>
      ))}
    </ul>
  );
}

export function MapEmbed({ address }: { address: string }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden border border-steel sm:aspect-video">
      <iframe
        title="Ubicación de Morén Peluquería de Caballeros en Google Maps"
        src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
        className="absolute inset-0 h-full w-full [filter:grayscale(1)_invert(.92)_contrast(.9)]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export function ContactBlock({ settings, weekly, todayDow }: { settings: PublicSettings; weekly: WeeklySchedule; todayDow?: number }) {
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="space-y-8">
        <ul className="space-y-5">
          <li className="flex gap-4">
            <IconPin className="mt-1 h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="label">Dirección</p>
              <p>{settings.address}</p>
            </div>
          </li>
          <li className="flex gap-4">
            <IconPhone className="mt-1 h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="label">Teléfono</p>
              <a href={telHref(settings.phone)} className="hover:text-gold">{settings.phone}</a>
            </div>
          </li>
          {settings.email && (
            <li className="flex gap-4">
              <IconMail className="mt-1 h-5 w-5 shrink-0 text-gold" />
              <div>
                <p className="label">Correo</p>
                <a href={`mailto:${settings.email}`} className="hover:text-gold">{settings.email}</a>
              </div>
            </li>
          )}
        </ul>
        <div className="grid gap-3 sm:grid-cols-3">
          <a href={telHref(settings.phone)} className="btn-outline"><IconPhone className="h-4 w-4" />Llamar</a>
          <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost"><IconPin className="h-4 w-4" />Cómo llegar</a>
          <Link href="/reservar" className="btn-gold">Reservar cita</Link>
        </div>
        <div>
          <p className="label mb-3 flex items-center gap-2"><IconClock className="h-4 w-4 text-gold" />Horario de apertura</p>
          <HoursTable weekly={weekly} todayDow={todayDow} />
        </div>
      </div>
      <MapEmbed address={settings.address} />
    </div>
  );
}
