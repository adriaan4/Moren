import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/env";

const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Morén Peluquería de Caballeros · Barbería en Zaragoza",
    template: "%s · Morén Peluquería de Caballeros Zaragoza",
  },
  description:
    "Peluquería de caballeros en Zaragoza (Avenida de Pablo Gargallo 107). Corte de pelo, barba y cuidado masculino. Reserva tu cita online.",
  keywords: ["peluquería de caballeros Zaragoza", "barbería Zaragoza", "corte de pelo hombre Zaragoza", "arreglo de barba Zaragoza", "peluquero Pablo Gargallo"],
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "Morén Peluquería de Caballeros",
    title: "Morén Peluquería de Caballeros · Zaragoza",
    description: "Tu estilo, en buenas manos. Reserva tu cita online.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
