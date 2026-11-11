import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const pages = ["", "/servicios", "/precios", "/galeria", "/sobre-nosotros", "/contacto", "/reservar", "/privacidad", "/aviso-legal"];
  return pages.map((p) => ({ url: `${base}${p}`, changeFrequency: p === "/precios" ? "weekly" : "monthly", priority: p === "" ? 1 : p === "/reservar" ? 0.9 : 0.7 }));
}
