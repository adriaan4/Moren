"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { Logo } from "@/components/public/Logo";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", { body: { username, password } });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-6 p-8">
      <div className="flex justify-center"><Logo /></div>
      <p className="text-center text-xs uppercase tracking-[0.3em] text-ash">Acceso privado</p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <label className="block">
        <span className="label">Usuario</span>
        <input className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label className="block">
        <span className="label">Contraseña</span>
        <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <button className="btn-gold w-full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
