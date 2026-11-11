import { minutesUntil, nowInMadrid, toMinutes, addDays } from "@/lib/time";
import * as bookingRepo from "@/repositories/bookingRepo";
import { notify } from "./notificationService";

/**
 * Envía el recordatorio de las citas que empiezan dentro de las próximas 24 h
 * y que aún no lo han recibido. Es idempotente: marca `reminderSentAt`.
 * Se ejecuta desde Vercel Cron (cada hora) – no depende de que nadie abra la web.
 */
export async function sendDueReminders(): Promise<{ checked: number; sent: number }> {
  const now = nowInMadrid();
  const candidates = await bookingRepo.listByRange(now.date, addDays(now.date, 1));
  let sent = 0;
  for (const b of candidates) {
    if (b.status !== "confirmed" || b.reminderSentAt) continue;
    const left = minutesUntil(b.date, toMinutes(b.time), now);
    if (left <= 0 || left > 24 * 60) continue;
    // Marcamos primero para evitar duplicados si dos ejecuciones se solapan
    await bookingRepo.saveBooking({ ...b, reminderSentAt: new Date().toISOString() });
    await notify("reminder", b);
    sent++;
  }
  return { checked: candidates.length, sent };
}
