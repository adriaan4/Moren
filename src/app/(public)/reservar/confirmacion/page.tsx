import Link from "next/link";
import type { Metadata } from "next";
import { timingSafeEqual } from "node:crypto";
import { IconCheck } from "@/components/ui/Icons";
import { PageHeader } from "@/components/public/Sections";
import { getBooking } from "@/repositories/bookingRepo";
import { getSettings } from "@/repositories/settingsRepo";
import { formatDateEs, formatPrice } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reserva confirmada", robots: { index: false, follow: false } };

export default async function ConfirmacionPage({ searchParams }: { searchParams: Promise<{ id?: string; k?: string }> }) {
  const { id = "", k = "" } = await searchParams;
  const booking = id ? await getBooking(id) : null;
  const ok = booking && Buffer.from(k).length === Buffer.from(booking.accessKey).length && timingSafeEqual(Buffer.from(k), Buffer.from(booking.accessKey));

  if (!ok || !booking) {
    return (
      <>
        <PageHeader eyebrow="Reserva" title="No encontramos esta reserva" />
        <section className="py-16"><div className="container-x"><Link href="/reservar" className="btn-gold">Hacer una reserva</Link></div></section>
      </>
    );
  }
  const settings = await getSettings();
  const pending = booking.status === "pending";
  const cancelled = booking.status === "cancelled";

  return (
    <>
      <PageHeader eyebrow="Reserva" title={cancelled ? "Reserva cancelada" : pending ? "Solicitud recibida" : "¡Cita confirmada!"} />
      <section className="py-14">
        <div className="container-x max-w-2xl space-y-8">
          {!cancelled && (
            <div className="flex items-start gap-4 border border-gold/40 bg-gold/5 p-5">
              <IconCheck className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
              <p className="text-sm leading-relaxed text-bone/85">
                {pending ? "Hemos recibido tu solicitud. Te escribiremos a " : "Te hemos enviado la confirmación a "}
                <strong>{booking.customer.email}</strong>.
              </p>
            </div>
          )}
          <dl className="card divide-y divide-steel text-sm">
            {[
              ["Código de reserva", booking.id],
              ["Servicio", booking.service.name],
              ["Fecha", formatDateEs(booking.date)],
              ["Hora", `${booking.time} – ${booking.endTime} h`],
              ["Precio", formatPrice(booking.service.priceCents)],
              ["Lugar", settings.address],
            ].map(([a, b]) => (
              <div key={a} className="flex justify-between gap-6 p-4"><dt className="text-ash">{a}</dt><dd className="text-right">{b}</dd></div>
            ))}
          </dl>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/mis-citas" className="btn-gold">Gestionar mis citas</Link>
            <Link href="/" className="btn-ghost">Volver al inicio</Link>
          </div>
        </div>
      </section>
    </>
  );
}
