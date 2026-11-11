import { timingSafeEqual } from "node:crypto";
import { api } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { getBookingOrThrow, publicView } from "@/services/bookingService";

/** Consulta de una reserva con su clave secreta (pantalla de confirmación). */
export const GET = api(
  async (req, ctx) => {
    const { id } = await ctx.params;
    const key = req.nextUrl.searchParams.get("k") ?? "";
    const booking = await getBookingOrThrow(id).catch(() => null);
    const a = Buffer.from(key);
    const b = Buffer.from(booking?.accessKey ?? "x");
    if (!booking || a.length !== b.length || !timingSafeEqual(a, b)) throw notFound("Reserva no encontrada");
    return { booking: publicView(booking) };
  },
  { rate: { name: "booking-view", limit: 60, windowSec: 600 } },
);
