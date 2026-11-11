"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconClose, IconMenu } from "@/components/ui/Icons";
import { api } from "@/lib/client/api";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/calendario", label: "Calendario" },
  { href: "/admin/citas", label: "Gestión de citas" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/precios", label: "Gestión de precios" },
  { href: "/admin/horarios", label: "Horarios de apertura" },
  { href: "/admin/vacaciones", label: "Vacaciones y festivos" },
  { href: "/admin/estadisticas", label: "Estadísticas" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export function AdminShell({ username, children }: { username: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await api("/api/admin/logout", { method: "POST", body: {} });
    router.replace("/admin/login");
    router.refresh();
  }

  const links = (
    <nav className="flex flex-col" aria-label="Panel">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className={`border-l-2 px-5 py-3 text-sm transition ${active ? "border-gold bg-gold/10 text-gold" : "border-transparent text-bone/75 hover:text-gold"}`}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Menú lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-steel bg-coal lg:flex">
        <div className="border-b border-steel p-6">
          <p className="font-display text-xl tracking-[0.3em] text-gold">MORÉN</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-ash">Panel privado</p>
        </div>
        <div className="flex-1 overflow-y-auto py-4">{links}</div>
        <div className="border-t border-steel p-5 text-xs">
          <p className="mb-3 text-ash">Sesión: {username}</p>
          <div className="flex gap-2">
            <Link href="/" className="btn-ghost btn-sm flex-1" target="_blank">Ver web</Link>
            <button onClick={logout} className="btn-ghost btn-sm flex-1">Salir</button>
          </div>
        </div>
      </aside>

      {/* Barra superior (móvil / tablet) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-steel bg-coal/95 px-4 backdrop-blur lg:hidden">
        <p className="font-display tracking-[0.3em] text-gold">MORÉN · ADMIN</p>
        <button onClick={() => setOpen(true)} className="flex h-12 w-12 items-center justify-center" aria-label="Abrir menú"><IconMenu /></button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex w-[85%] max-w-xs animate-fade-in flex-col overflow-y-auto border-r border-steel bg-coal">
            <div className="flex items-center justify-between border-b border-steel p-4">
              <span className="font-display tracking-[0.3em] text-gold">MENÚ</span>
              <button onClick={() => setOpen(false)} className="flex h-12 w-12 items-center justify-center" aria-label="Cerrar"><IconClose /></button>
            </div>
            <div className="py-3">{links}</div>
            <div className="mt-auto flex gap-2 border-t border-steel p-4">
              <Link href="/" target="_blank" className="btn-ghost btn-sm flex-1">Ver web</Link>
              <button onClick={logout} className="btn-ghost btn-sm flex-1">Salir</button>
            </div>
          </div>
          <button className="flex-1 bg-black/70" onClick={() => setOpen(false)} aria-label="Cerrar menú" />
        </div>
      )}

      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
