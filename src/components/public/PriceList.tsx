import Link from "next/link";
import { durationLabel } from "@/lib/format";
import { formatPrice } from "@/lib/time";

export interface PublicService {
  id: string;
  name: string;
  priceCents: number;
  description?: string;
  durationMin?: number;
  imageUrl?: string;
}

/** Lista elegante de servicios y precios (solo servicios activos; nunca se inventan datos). */
export function PriceList({ services, withImages = false }: { services: PublicService[]; withImages?: boolean }) {
  if (!services.length) {
    return <p className="border border-dashed border-steel p-8 text-center text-ash">Los servicios y precios se publicarán muy pronto. Mientras tanto, llámanos y te informamos.</p>;
  }
  return (
    <ul className="divide-y divide-steel border-y border-steel">
      {services.map((s) => (
        <li key={s.id} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex gap-4">
            {withImages && s.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.imageUrl} alt={s.name} loading="lazy" className="h-20 w-20 shrink-0 object-cover" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="font-display text-xl sm:text-2xl">{s.name}</h3>
                {s.durationMin ? <span className="text-xs uppercase tracking-widest text-ash">{durationLabel(s.durationMin)}</span> : null}
              </div>
              {s.description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-bone/70">{s.description}</p>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-5 sm:justify-end">
            <span className="font-display text-2xl text-gold">{formatPrice(s.priceCents)}</span>
            <Link href={`/reservar?servicio=${s.id}`} className="btn-outline btn-sm">
              Reservar cita
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
