import { siteUrl } from "@/lib/env";
import { formatDateEs, formatPrice } from "@/lib/time";
import type { Booking, Settings } from "@/types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(settings: Settings, title: string, intro: string, bodyHtml: string, ctaHref?: string, ctaLabel?: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#0a0a0a;font-family:Helvetica,Arial,sans-serif;color:#f4f1ea">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#141414;border:1px solid #2a2a2a">
<tr><td style="padding:28px 32px;border-bottom:2px solid #c9a24b;text-align:center">
<div style="font-family:Georgia,serif;font-size:22px;letter-spacing:4px;color:#c9a24b">MORÉN</div>
<div style="font-size:10px;letter-spacing:3px;color:#8a8a8a;margin-top:4px">PELUQUERÍA DE CABALLEROS</div></td></tr>
<tr><td style="padding:32px">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 12px;color:#fff">${esc(title)}</h1>
<p style="margin:0 0 24px;color:#cfcac0;line-height:1.6;font-size:15px">${intro}</p>
${bodyHtml}
${ctaHref ? `<p style="text-align:center;margin:28px 0 0"><a href="${ctaHref}" style="display:inline-block;background:#c9a24b;color:#0a0a0a;text-decoration:none;font-weight:bold;letter-spacing:2px;font-size:12px;padding:14px 28px">${esc(ctaLabel ?? "VER MI RESERVA")}</a></p>` : ""}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #2a2a2a;color:#8a8a8a;font-size:12px;line-height:1.6;text-align:center">
${esc(settings.address)}<br>Tel. ${esc(settings.phone)}</td></tr>
</table></td></tr></table></body></html>`;
}

function details(b: Booking): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;color:#8a8a8a;font-size:13px;width:110px">${k}</td><td style="padding:8px 0;color:#fff;font-size:15px">${v}</td></tr>`;
  return `<table role="presentation" width="100%" style="border-top:1px solid #2a2a2a;border-bottom:1px solid #2a2a2a;margin:8px 0">
${row("Reserva", `<strong style="color:#c9a24b;letter-spacing:1px">${esc(b.id)}</strong>`)}
${row("Servicio", esc(b.service.name))}
${row("Fecha", esc(formatDateEs(b.date)))}
${row("Hora", `${b.time} h`)}
${row("Precio", esc(formatPrice(b.service.priceCents)))}
</table>`;
}

function textDetails(b: Booking): string {
  return `Reserva: ${b.id}\nServicio: ${b.service.name}\nFecha: ${formatDateEs(b.date)}\nHora: ${b.time} h\nPrecio: ${formatPrice(b.service.priceCents)}`;
}

export type EmailKind = "created" | "modified" | "cancelled" | "reminder" | "owner_new";

export function buildEmail(
  kind: EmailKind,
  b: Booking,
  settings: Settings,
  links: { confirmation: string; manage: string },
  extra?: { previous?: { date: string; time: string } },
): { subject: string; html: string; text: string } {
  const name = esc(b.customer.firstName);
  switch (kind) {
    case "created": {
      const pending = b.status === "pending";
      const subject = pending ? `Solicitud de cita recibida · ${b.id}` : `Cita confirmada · ${b.id}`;
      return {
        subject,
        html: layout(settings, pending ? "Hemos recibido tu solicitud" : "Tu cita está confirmada", `Hola ${name}, ${pending ? "recibirás otro correo cuando confirmemos tu cita." : "te esperamos. Estos son los detalles:"}`, details(b), links.confirmation),
        text: `Hola ${b.customer.firstName},\n${pending ? "Hemos recibido tu solicitud." : "Tu cita está confirmada."}\n\n${textDetails(b)}\n\nGestionar: ${links.manage}`,
      };
    }
    case "modified": {
      const prev = extra?.previous ? ` (antes: ${formatDateEs(extra.previous.date)} a las ${extra.previous.time} h)` : "";
      return {
        subject: `Cita modificada · ${b.id}`,
        html: layout(settings, "Tu cita ha sido modificada", `Hola ${name}, hemos actualizado tu reserva.${esc(prev)}`, details(b), links.confirmation),
        text: `Hola ${b.customer.firstName},\nTu cita ha sido modificada${prev}.\n\n${textDetails(b)}\n\nGestionar: ${links.manage}`,
      };
    }
    case "cancelled":
      return {
        subject: `Cita cancelada · ${b.id}`,
        html: layout(settings, "Tu cita ha sido cancelada", `Hola ${name}, confirmamos la cancelación de esta reserva. Cuando quieras, puedes reservar de nuevo.`, details(b), `${siteUrl()}/reservar`, "RESERVAR DE NUEVO"),
        text: `Hola ${b.customer.firstName},\nTu cita ha sido cancelada.\n\n${textDetails(b)}`,
      };
    case "reminder":
      return {
        subject: `Recordatorio: mañana tienes cita en Morén · ${b.time} h`,
        html: layout(settings, "Te esperamos mañana", `Hola ${name}, te recordamos tu cita. Si no puedes venir, avísanos o cancélala desde tu reserva.`, details(b), links.manage, "GESTIONAR MI CITA"),
        text: `Hola ${b.customer.firstName},\nRecordatorio de tu cita:\n\n${textDetails(b)}\n\nGestionar: ${links.manage}`,
      };
    case "owner_new":
      return {
        subject: `Nueva reserva · ${b.date} ${b.time} · ${b.customer.firstName} ${b.customer.lastName}`,
        html: layout(
          settings,
          "Nueva reserva",
          `${esc(b.customer.firstName)} ${esc(b.customer.lastName)} · ${esc(b.customer.phone)} · ${esc(b.customer.email)}`,
          details(b) + (b.notes ? `<p style="color:#cfcac0;font-size:14px">Notas: ${esc(b.notes)}</p>` : ""),
        ),
        text: `Nueva reserva de ${b.customer.firstName} ${b.customer.lastName} (${b.customer.phone}, ${b.customer.email})\n\n${textDetails(b)}`,
      };
  }
}

export function magicLinkEmail(settings: Settings, link: string, firstName: string) {
  return {
    subject: "Tu enlace para gestionar tus citas · Morén",
    html: layout(settings, "Accede a tus citas", `Hola ${esc(firstName)}, pulsa el botón para ver, modificar o cancelar tus citas. El enlace caduca en 30 minutos.`, "", link, "VER MIS CITAS"),
    text: `Hola ${firstName},\nAccede a tus citas con este enlace (caduca en 30 minutos):\n${link}`,
  };
}
