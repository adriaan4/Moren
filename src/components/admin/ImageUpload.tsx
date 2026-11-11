"use client";

import { useRef, useState } from "react";
import { api, imageToDataUrl } from "@/lib/client/api";

/** Selecciona una foto, la reduce en el navegador y la sube. Devuelve la URL pública. */
export function ImageUpload({ value, onChange, label = "Subir foto" }: { value?: string; onChange: (url: string) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const dataUrl = await imageToDataUrl(file);
      const r = await api<{ url: string }>("/api/admin/uploads", { body: { dataUrl } });
      onChange(r.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-16 w-16 object-cover" />
      ) : <span className="flex h-16 w-16 items-center justify-center border border-dashed border-steel text-[10px] text-ash">Sin foto</span>}
      <div className="space-y-1">
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <div className="flex gap-2">
          <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? "Subiendo…" : label}</button>
          {value && <button type="button" className="btn-ghost btn-sm" onClick={() => onChange("")}>Quitar</button>}
        </div>
        {err && <p className="text-xs text-red-300">{err}</p>}
      </div>
    </div>
  );
}
