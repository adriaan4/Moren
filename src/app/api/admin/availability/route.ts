import { api, parseQuery } from "@/lib/api";
import { badRequest } from "@/lib/errors";
import { availabilityQuerySchema } from "@/schemas";
import { getService } from "@/repositories/serviceRepo";
import { getSettings } from "@/repositories/settingsRepo";
import { getAvailableSlots, getMonthOverview } from "@/services/availability";

/** Igual que la pública pero sin antelación mínima ni límite de días, y admite servicios desactivados. */
export const GET = api(
  async (req) => {
    const q = parseQuery(req, availabilityQuerySchema);
    const settings = await getSettings();
    let duration = settings.defaultDurationMin;
    if (q.serviceId) {
      const s = await getService(q.serviceId);
      if (!s) throw badRequest("Servicio no encontrado");
      duration = s.durationMin ?? duration;
    }
    const opts = { enforceWindow: false, excludeBookingId: q.exclude };
    if (q.month) return { days: await getMonthOverview(q.month, duration, opts) };
    if (q.date) return { date: q.date, slots: await getAvailableSlots(q.date, duration, opts) };
    throw badRequest("Indica date o month");
  },
  { admin: true },
);
