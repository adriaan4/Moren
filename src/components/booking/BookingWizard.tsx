"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconCheck } from "@/components/ui/Icons";
import { api } from "@/lib/client/api";
import { durationLabel } from "@/lib/format";
import { formatDateEs, formatPrice } from "@/lib/time";
import { SlotPicker } from "./SlotPicker";

export interface WizardService {
  id: string;
  name: string;
  priceCents: number;
  description?: string;
  effectiveDurationMin: number;
}

const STEPS = ["Servicio", "Fecha y hora", "Tus datos", "Confirmar"];

export function BookingWizard({ services, initialServiceId, requireApproval }: { services: WizardService[]; initialServiceId?: string; requireApproval: boolean }) {
  const router = useRouter();
  const preselected = services.find((s) => s.id === initialServiceId)?.id ?? null;
  const [step, setStep] = useState(preselected ? 1 : 0);
  const [serviceId, setServiceId] = useState<string | null>(preselected);
  const [slot, setSlot] = useState<{ date: string | null; time: string | null }>({ date: null, time: null });
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", notes: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const service = services.find((s) => s.id === serviceId) ?? null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validateData(): boolean {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = "Introduce tu nombre";
    if (!form.lastName.trim()) errs.lastName = "Introduce tus apellidos";
    if (!/^\+?[\d\s().-]{9,18}$/.test(form.phone.trim())) errs.phone = "Teléfono no válido";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errs.email = "Correo no válido";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function confirm() {
    if (!service || !slot.date || !slot.time || !consent) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{ booking: { id: string }; accessKey: string }>("/api/bookings", {
        body: {
          serviceId: service.id,
          date: slot.date,
          time: slot.time,
          customer: { firstName: form.firstName, lastName: form.lastName, phone: form.phone, email: form.email },
          notes: form.notes || undefined,
          consent: true,
        },
      });
      router.push(`/reservar/confirmacion?id=${res.booking.id}&k=${res.accessKey}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la reserva");
      setBusy(false);
      if ((e as { status?: number }).status === 409) {
        setSlot((s) => ({ ...s, time: null }));
        setStep(1);
      }
    }
  }

  if (!services.length) {
    return <p className="border border-dashed border-steel p-8 text-center text-ash">Todavía no hay servicios disponibles para reservar online. Llámanos y te atendemos encantados.</p>;
  }

  return (
    <div>
      {/* Indicador de pasos */}
      <ol className="mb-10 grid grid-cols-4 gap-2" aria-label="Progreso de la reserva">
        {STEPS.map((label, i) => (
          <li key={label} className={`border-t-2 pt-3 text-[10px] uppercase tracking-[0.18em] sm:text-[11px] ${i <= step ? "border-gold text-gold" : "border-steel text-ash"}`} aria-current={i === step ? "step" : undefined}>
            <span className="hidden sm:inline">{i + 1}. </span>{label}
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="mb-6 border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}

      {/* 1. Servicio */}
      {step === 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-2xl">¿Qué necesitas?</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {services.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => { setServiceId(s.id); setSlot({ date: null, time: null }); setStep(1); }}
                  className={`flex min-h-[88px] w-full items-center justify-between gap-4 border p-5 text-left transition hover:border-gold ${serviceId === s.id ? "border-gold bg-gold/10" : "border-steel bg-coal"}`}>
                  <span>
                    <span className="block font-display text-xl">{s.name}</span>
                    <span className="mt-1 block text-xs uppercase tracking-widest text-ash">{durationLabel(s.effectiveDurationMin)}</span>
                  </span>
                  <span className="font-display text-xl text-gold">{formatPrice(s.priceCents)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. Fecha y hora */}
      {step === 1 && service && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Elige día y hora</h2>
            <button type="button" className="text-xs uppercase tracking-widest text-gold" onClick={() => setStep(0)}>
              {service.name} · {formatPrice(service.priceCents)} · cambiar
            </button>
          </div>
          <SlotPicker serviceId={service.id} value={slot} onChange={setSlot} />
          <div className="flex justify-between gap-3 pt-4">
            <button type="button" className="btn-ghost" onClick={() => setStep(0)}>Atrás</button>
            <button type="button" className="btn-gold" disabled={!slot.date || !slot.time} onClick={() => setStep(2)}>Continuar</button>
          </div>
        </div>
      )}

      {/* 3. Datos */}
      {step === 2 && (
        <form className="space-y-6" noValidate onSubmit={(e) => { e.preventDefault(); if (validateData()) setStep(3); }}>
          <h2 className="font-display text-2xl">Tus datos</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nombre" error={fieldErrors.firstName}><input className="input" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} required /></Field>
            <Field label="Apellidos" error={fieldErrors.lastName}><input className="input" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} required /></Field>
            <Field label="Teléfono" error={fieldErrors.phone}><input className="input" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} required /></Field>
            <Field label="Correo electrónico" error={fieldErrors.email}><input className="input" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set("email")} required /></Field>
          </div>
          <Field label="Comentarios (opcional)"><textarea className="input min-h-[96px] py-3" maxLength={300} value={form.notes} onChange={set("notes")} /></Field>
          <div className="flex justify-between gap-3">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>Atrás</button>
            <button type="submit" className="btn-gold">Revisar reserva</button>
          </div>
        </form>
      )}

      {/* 4. Revisión */}
      {step === 3 && service && slot.date && slot.time && (
        <div className="space-y-6">
          <h2 className="font-display text-2xl">Revisa tu reserva</h2>
          <dl className="card divide-y divide-steel text-sm">
            {[
              ["Servicio", service.name],
              ["Fecha", formatDateEs(slot.date)],
              ["Hora", `${slot.time} h`],
              ["Duración", durationLabel(service.effectiveDurationMin)],
              ["Precio", formatPrice(service.priceCents)],
              ["Cliente", `${form.firstName} ${form.lastName}`],
              ["Contacto", `${form.phone} · ${form.email}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 p-4"><dt className="text-ash">{k}</dt><dd className="text-right capitalize-first">{v}</dd></div>
            ))}
          </dl>
          {requireApproval && <p className="text-sm text-gold-light">Tu cita quedará pendiente hasta que la peluquería la confirme; te avisaremos por correo.</p>}
          <label className="flex cursor-pointer items-start gap-3 text-sm text-bone/80">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#c9a24b]" />
            <span>He leído y acepto la <Link href="/privacidad" target="_blank" className="text-gold underline">política de privacidad</Link> y consiento el tratamiento de mis datos para gestionar mi cita.</span>
          </label>
          <div className="flex justify-between gap-3">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)} disabled={busy}>Atrás</button>
            <button type="button" className="btn-gold" onClick={confirm} disabled={!consent || busy}>
              {busy ? "Reservando…" : <><IconCheck className="h-4 w-4" />Confirmar cita</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400" role="alert">{error}</span>}
    </label>
  );
}
