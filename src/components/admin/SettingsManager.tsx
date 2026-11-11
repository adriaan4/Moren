"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import type { Settings } from "@/types";
import { ImageUpload } from "./ImageUpload";
import { AdminTitle, Field, Notice, Toggle } from "./ui";

interface BackupInfo { backups: string[] }

export function SettingsManager() {
  const [s, setS] = useState<Settings | null>(null);
  const [msg, setMsg] = useState<{ k: "ok" | "err"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [backups, setBackups] = useState<string[]>([]);
  const [pw, setPw] = useState({ current: "", next: "" });

  useEffect(() => {
    api<{ settings: Settings }>("/api/admin/settings").then((r) => setS(r.settings)).catch((e) => setMsg({ k: "err", t: e.message }));
    api<BackupInfo>("/api/admin/backup").then((r) => setBackups(r.backups)).catch(() => undefined);
  }, []);

  if (!s) return <div className="h-64 animate-pulse bg-graphite" />;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value) as never);
  const ok = (t: string) => setMsg({ k: "ok", t });
  const fail = (e: unknown) => setMsg({ k: "err", t: e instanceof Error ? e.message : "Error" });

  async function save() {
    setBusy(true);
    try { await api("/api/admin/settings", { method: "PUT", body: s }); ok("Configuración guardada y publicada."); } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function makeBackup() {
    try { await api("/api/admin/backup", { body: {} }); setBackups((await api<BackupInfo>("/api/admin/backup")).backups); ok("Copia de seguridad creada."); } catch (e) { fail(e); }
  }
  async function restore(id: string) {
    if (!window.confirm(`¿Restaurar la copia ${id}? Se creará antes una copia del estado actual.`)) return;
    try { await api("/api/admin/backup", { method: "PUT", body: { id } }); ok("Copia restaurada."); } catch (e) { fail(e); }
  }
  async function changePw() {
    try { await api("/api/admin/me", { method: "PUT", body: pw }); setPw({ current: "", next: "" }); ok("Contraseña actualizada."); } catch (e) { fail(e); }
  }

  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="card mb-8 p-5 sm:p-6"><h2 className="mb-5 font-display text-xl">{title}</h2><div className="space-y-5">{children}</div></section>
  );

  return (
    <>
      <AdminTitle title="Configuración"><button className="btn-gold" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button></AdminTitle>
      {msg && <Notice kind={msg.k}>{msg.t}</Notice>}

      <Block title="Datos del negocio">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre del negocio"><input className="input" value={s.businessName} onChange={(e) => set("businessName", e.target.value)} /></Field>
          <Field label="Teléfono"><input className="input" value={s.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Dirección"><input className="input" value={s.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="Correo electrónico"><input className="input" type="email" value={s.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
        <Field label="Enlace de Google Maps"><input className="input" value={s.mapsUrl} onChange={(e) => set("mapsUrl", e.target.value)} /></Field>
        <Field label="Correo para avisos de nuevas reservas" hint="Si lo dejas vacío se usa el correo del negocio."><input className="input" type="email" value={s.ownerNotifyEmail} onChange={(e) => set("ownerNotifyEmail", e.target.value)} /></Field>
      </Block>

      <Block title="Mensajes de la página principal">
        <Field label="Frase comercial"><input className="input" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
        <Field label="Presentación (portada)"><textarea className="input min-h-[90px] py-3" value={s.intro} onChange={(e) => set("intro", e.target.value)} /></Field>
        <Field label="Sobre nosotros" hint="Separa los párrafos con una línea en blanco."><textarea className="input min-h-[140px] py-3" value={s.about} onChange={(e) => set("about", e.target.value)} /></Field>
        <Field label="Aviso destacado en la web (opcional)"><input className="input" value={s.announcement} onChange={(e) => set("announcement", e.target.value)} /></Field>
      </Block>

      <Block title="Fotografías">
        <Field label="Imagen de portada"><ImageUpload value={s.heroImageUrl} onChange={(u) => set("heroImageUrl", u)} label="Subir portada" /></Field>
        <Field label={`Galería (${s.gallery.length})`}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {s.gallery.map((u, i) => (
              <div key={u + i} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
                <button className="absolute right-1 top-1 h-7 w-7 bg-black/80 text-xs" onClick={() => set("gallery", s.gallery.filter((_, j) => j !== i))} aria-label="Quitar foto">✕</button>
              </div>
            ))}
          </div>
          <div className="mt-3"><ImageUpload onChange={(u) => u && set("gallery", [...s.gallery, u])} label="Añadir foto" /></div>
        </Field>
      </Block>

      <Block title="Opiniones de clientes">
        <p className="text-sm text-ash">Solo se muestran las opiniones reales que añadas aquí (con permiso de quien las escribió).</p>
        {s.reviews.map((r, i) => (
          <div key={i} className="grid gap-3 border border-steel p-4 sm:grid-cols-[1fr_90px_auto]">
            <input className="input" placeholder="Nombre" value={r.author} onChange={(e) => set("reviews", s.reviews.map((x, j) => (j === i ? { ...x, author: e.target.value } : x)))} />
            <input className="input" type="number" min={1} max={5} value={r.rating} onChange={(e) => set("reviews", s.reviews.map((x, j) => (j === i ? { ...x, rating: Number(e.target.value) } : x)))} aria-label="Estrellas" />
            <button className="btn-ghost btn-sm" onClick={() => set("reviews", s.reviews.filter((_, j) => j !== i))}>Quitar</button>
            <textarea className="input min-h-[70px] py-3 sm:col-span-3" placeholder="Texto de la opinión" value={r.text} onChange={(e) => set("reviews", s.reviews.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
          </div>
        ))}
        <button className="btn-ghost btn-sm" onClick={() => set("reviews", [...s.reviews, { author: "", text: "", rating: 5 }])}>+ Añadir opinión</button>
      </Block>

      <Block title="Reglas de reserva">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Antelación mínima para reservar (horas)"><input className="input" type="number" min={0} value={s.minAdvanceHours} onChange={num("minAdvanceHours")} /></Field>
          <Field label="Máximo de días hacia el futuro"><input className="input" type="number" min={1} max={365} value={s.maxDaysAhead} onChange={num("maxDaysAhead")} /></Field>
          <Field label="Cancelar hasta X horas antes"><input className="input" type="number" min={0} value={s.cancelMinHours} onChange={num("cancelMinHours")} /></Field>
          <Field label="Modificar hasta X horas antes"><input className="input" type="number" min={0} value={s.modifyMinHours} onChange={num("modifyMinHours")} /></Field>
          <Field label="Intervalo entre horas (minutos)"><select className="input" value={s.slotStepMin} onChange={(e) => set("slotStepMin", Number(e.target.value))}>{[15, 30, 45, 60].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
          <Field label="Duración por defecto (minutos)" hint="Para servicios sin duración propia."><input className="input" type="number" min={5} value={s.defaultDurationMin} onChange={num("defaultDurationMin")} /></Field>
        </div>
        <div className="flex items-center gap-3"><Toggle checked={s.allowServiceChange} onChange={(v) => set("allowServiceChange", v)} label="Permitir cambiar de servicio" /><span className="text-sm">El cliente puede cambiar de servicio al modificar su cita</span></div>
        <div className="flex items-center gap-3"><Toggle checked={s.requireApproval} onChange={(v) => set("requireApproval", v)} label="Aprobar reservas" /><span className="text-sm">Las reservas web quedan pendientes hasta que yo las confirme</span></div>
      </Block>

      <Block title="Seguridad y copias de seguridad">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contraseña actual"><input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="Nueva contraseña (mín. 10)"><input className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        </div>
        <button className="btn-outline btn-sm" onClick={changePw} disabled={!pw.current || pw.next.length < 10}>Cambiar contraseña</button>
        <div className="border-t border-steel pt-5">
          <p className="mb-3 text-sm text-ash">Se guarda una copia automática cada noche (se conservan las últimas 14).</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-outline btn-sm" onClick={makeBackup}>Crear copia ahora</button>
            <a className="btn-ghost btn-sm" href="/api/admin/backup?download=1">Descargar copia (JSON)</a>
          </div>
          {backups.length > 0 && (
            <ul className="mt-4 divide-y divide-steel border-y border-steel text-xs">
              {backups.slice(0, 6).map((id) => <li key={id} className="flex items-center justify-between gap-3 py-2"><span>{id}</span><button className="btn-ghost btn-sm" onClick={() => restore(id)}>Restaurar</button></li>)}
            </ul>
          )}
        </div>
      </Block>
    </>
  );
}
