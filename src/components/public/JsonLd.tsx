import { siteUrl } from "@/lib/env";
import type { Settings, WeeklySchedule } from "@/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Datos estructurados (SEO local): HairSalon / BarberShop en Zaragoza. */
export function LocalBusinessJsonLd({ settings, weekly }: { settings: Omit<Settings, "ownerNotifyEmail">; weekly: WeeklySchedule }) {
  const hours = Object.entries(weekly).flatMap(([dow, d]) =>
    d.open ? d.ranges.map((r) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[Number(dow)], opens: r.start, closes: r.end })) : [],
  );
  const data = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: settings.businessName,
    description: settings.intro,
    url: siteUrl(),
    telephone: `+34${settings.phone.replace(/\D/g, "")}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Avenida de Pablo Gargallo 107",
      postalCode: "50003",
      addressLocality: "Zaragoza",
      addressRegion: "Aragón",
      addressCountry: "ES",
    },
    hasMap: settings.mapsUrl,
    areaServed: "Zaragoza",
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
