import Link from "next/link";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { IconPhone } from "@/components/ui/Icons";
import { getPublicInfo } from "@/services/publicInfo";
import { formatDateEs } from "@/lib/time";
import { telHref } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const info = await getPublicInfo();
  const { settings, banners } = info;

  return (
    <>
      <SiteHeader />
      {(banners.length > 0 || settings.announcement) && (
        <div className="relative z-30 mt-16 border-b border-gold/30 bg-gold/10 px-5 py-3 text-center text-sm text-gold-light lg:mt-20" role="status">
          {settings.announcement && <p>{settings.announcement}</p>}
          {banners.map((b) => (
            <p key={b.id}>
              <strong className="font-semibold">
                {b.reason}
                {b.start === b.end ? ` · ${formatDateEs(b.start, { day: "numeric", month: "long" })}` : ` · del ${formatDateEs(b.start, { day: "numeric", month: "long" })} al ${formatDateEs(b.end, { day: "numeric", month: "long" })}`}
              </strong>
              {b.message ? ` — ${b.message}` : ""}
            </p>
          ))}
        </div>
      )}
      <main id="contenido">{children}</main>
      <SiteFooter settings={settings} />

      {/* Barra inferior móvil: reservar y llamar siempre accesibles */}
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[auto_1fr] gap-px border-t border-gold/40 bg-ink/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <a href={telHref(settings.phone)} className="flex h-14 w-16 items-center justify-center text-gold" aria-label="Llamar a la peluquería">
          <IconPhone />
        </a>
        <Link href="/reservar" className="btn-gold h-14 !min-h-[56px]">
          Reservar cita
        </Link>
      </div>
    </>
  );
}
