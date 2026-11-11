import { buildEmail, type EmailKind } from "@/lib/emailTemplates";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { newSecret } from "@/lib/ids";
import { getSettings } from "@/repositories/settingsRepo";
import { saveMagicToken } from "@/repositories/authRepo";
import type { Booking, Settings } from "@/types";

export type NotificationEvent = "created" | "modified" | "cancelled" | "reminder";

export interface NotificationPayload {
  event: NotificationEvent;
  booking: Booking;
  settings: Settings;
  links: { confirmation: string; manage: string };
  previous?: { date: string; time: string };
  /** No avisar al propietario (p. ej. al confirmar una reserva pendiente que ya le avisó) */
  skipOwner?: boolean;
}

/** Un canal de notificación. Para añadir SMS o WhatsApp basta con implementar esta interfaz y registrarlo abajo. */
export interface NotificationChannel {
  name: string;
  enabled(): boolean;
  send(p: NotificationPayload): Promise<void>;
}

const emailChannel: NotificationChannel = {
  name: "email",
  enabled: () => true,
  async send(p) {
    const kind: EmailKind = p.event;
    const mail = buildEmail(kind, p.booking, p.settings, p.links, { previous: p.previous });
    await sendEmail({ to: p.booking.customer.email, ...mail });

    if (p.event === "created" && p.booking.source === "web" && !p.skipOwner) {
      const owner = process.env.OWNER_NOTIFY_EMAIL || p.settings.ownerNotifyEmail || p.settings.email;
      if (owner) {
        const ownerMail = buildEmail("owner_new", p.booking, p.settings, p.links);
        await sendEmail({ to: owner, ...ownerMail });
      }
    }
  },
};

// Futuro: const smsChannel: NotificationChannel = { name: "sms", enabled: () => !!process.env.SMS_API_KEY, send: ... }
const channels: NotificationChannel[] = [emailChannel];

/** Las notificaciones nunca deben romper una reserva: los errores se registran y se ignoran. */
export async function notify(event: NotificationEvent, booking: Booking, extra: { previous?: { date: string; time: string }; skipOwner?: boolean } = {}): Promise<void> {
  try {
    const settings = await getSettings();
    const base = siteUrl();
    const token = newSecret(24);
    await saveMagicToken(token, booking.customerId, 60 * 60 * 24); // enlace de gestión válido 24 h
    const links = {
      confirmation: `${base}/reservar/confirmacion?id=${booking.id}&k=${booking.accessKey}`,
      manage: `${base}/api/my/verify?token=${token}`,
    };
    await Promise.all(
      channels
        .filter((c) => c.enabled())
        .map((c) => c.send({ event, booking, settings, links, ...extra }).catch((e) => console.error(`[notify:${c.name}]`, e))),
    );
  } catch (err) {
    console.error("[notify] error", err);
  }
}
