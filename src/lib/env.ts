/** Dirección pública de la web (se usa en los enlaces de los correos). Configúrala con SITE_URL. */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) {
    const withProtocol = /^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`;
    return withProtocol.replace(/\/+$/, "");
  }
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
