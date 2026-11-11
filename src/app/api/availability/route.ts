import { api, parseQuery } from "@/lib/api";
import { badRequest } from "@/lib/errors";
import { availabilityQuerySchema } from "@/schemas";
import { getService } from "@/repositories/serviceRepo";
import { getSettings } from "@/repositories/settingsRepo";
import { getAvailableSlots, getMonthOverview } from "@/services/availability";

/**
 * Disponibilidad pública calculada en el servidor.
 *  ?month=2026-12&serviceId=…  → estado de cada día
 *  ?date=2026-12-03&serviceId=… → horas libres
 * No expone ningún dato personal.
 */
export const GET = api(async (req) => {
  const q = parseQuery(req, availabilityQuerySchema);
  const settings = await getSettings();
  let duration = settings.defaultDurationMin;
  if (q.serviceId) {
    const s = await getService(q.serviceId);
    if (!s || !s.active) throw badRequest("Servicio no disponible");
    duration = s.durationMin ?? duration;
  }
  if (q.month) return { days: await getMonthOverview(q.month, duration, { excludeBookingId: q.exclude }) };
  if (q.date) return { date: q.date, slots: await getAvailableSlots(q.date, duration, { excludeBookingId: q.exclude }) };
  throw badRequest("Indica date o month");
}, { rate: { name: "availability", limit: 240, windowSec: 60 } });
