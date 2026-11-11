import Link from "next/link";
import { telHref } from "@/lib/format";
import { IconPhone, IconPin } from "@/components/ui/Icons";
import { Logo } from "./Logo";
import type { Settings } from "@/types";

export function SiteFooter({ settings }: { settings: Omit<Settings, "ownerNotifyEmail"> }) {
  return (
    <footer className="border-t border-steel bg-coal pb-28 pt-14 lg:pb-14">
      <div className="container-x grid gap-10 md:grid-cols-3">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-ash">{settings.tagline}</p>
        </div>
        <div className="space-y-3 text-sm">
          <p className="eyebrow">Contacto</p>
          <a href={settings.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 hover:text-gold">
            <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            {settings.address}
          </a>
          <a href={telHref(settings.phone)} className="flex items-center gap-3 hover:text-gold">
            <IconPhone className="h-4 w-4 text-gold" />
            {settings.phone}
          </a>
        </div>
        <div className="space-y-3 text-sm">
          <p className="eyebrow">Información</p>
          <ul className="space-y-2 text-bone/80">
            <li><Link href="/privacidad" className="hover:text-gold">Política de privacidad y cookies</Link></li>
            <li><Link href="/aviso-legal" className="hover:text-gold">Aviso legal</Link></li>
            <li><Link href="/mis-citas" className="hover:text-gold">Mis citas</Link></li>
          </ul>
        </div>
      </div>
      <p className="container-x mt-10 border-t border-steel pt-6 text-xs text-ash">
        © {new Date().getFullYear()} {settings.businessName}. Esta web solo utiliza cookies técnicas necesarias para el funcionamiento de las reservas.
      </p>
    </footer>
  );
}
