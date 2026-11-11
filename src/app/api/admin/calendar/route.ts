import { z } from "zod";
import { api, parseQuery } from "@/lib/api";
import { dateStr } from "@/schemas";
import { listByRange } from "@/repositories/bookingRepo";
import { getScheduleRange } from "@/services/availability";

const q = z.object({ from: dateStr, to: dateStr });

/** Calendario privado: reservas con detalle + horario efectivo (vacaciones, bloqueos…) del rango. */
export const GET = api(
  async (req) => {
    const { from, to } = parseQuery(req, q);
    const [bookings, days] = await Promise.all([listByRange(from, to), getScheduleRange(from, to)]);
    return { bookings, days };
  },
  { admin: true },
);
