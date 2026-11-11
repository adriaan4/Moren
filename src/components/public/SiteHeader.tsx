"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconClose, IconMenu } from "@/components/ui/Icons";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/precios", label: "Precios" },
  { href: "/galeria", label: "Galería" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
  { href: "/contacto", label: "Contacto" },
  { href: "/mis-citas", label: "Mis citas" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition duration-300 ${scrolled || open ? "border-b border-steel bg-ink/95 backdrop-blur" : "bg-gradient-to-b from-ink/80 to-transparent"}`}>
      <div className="container-x flex h-16 items-center justify-between lg:h-20">
        <Link href="/" aria-label="Morén Peluquería de Caballeros – Inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`text-[11px] font-semibold uppercase tracking-[0.2em] transition hover:text-gold ${pathname === n.href ? "text-gold" : "text-bone/80"}`}>
              {n.label}
            </Link>
          ))}
          <Link href="/reservar" className="btn-gold btn-sm">
            Reservar cita
          </Link>
        </nav>

        <button type="button" className="flex h-12 w-12 items-center justify-center text-bone lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Cerrar menú" : "Abrir menú"}>
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>

      {open && (
        <nav className="container-x flex h-[calc(100dvh-4rem)] animate-fade-in flex-col gap-1 overflow-y-auto pb-10 pt-6 lg:hidden" aria-label="Móvil">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`border-b border-steel py-4 font-display text-2xl ${pathname === n.href ? "text-gold" : "text-bone"}`}>
              {n.label}
            </Link>
          ))}
          <Link href="/reservar" className="btn-gold mt-8">
            Reservar cita
          </Link>
        </nav>
      )}
    </header>
  );
}
