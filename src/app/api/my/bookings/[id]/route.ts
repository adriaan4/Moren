import { api, parseBody } from "@/lib/api";
import { rescheduleSchema } from "@/schemas";
import { publicView, rescheduleBooking } from "@/services/bookingService";

/** Modificar fecha, hora o servicio de una cita propia. */
export const PATCH = api(
  async (req, ctx, session) => {
    const { id } = await ctx.params;
    const body = await parseBody(req, rescheduleSchema);
    const booking = await rescheduleBooking(id, body, { role: "client", customerId: session!.sub });
    return { booking: publicView(booking) };
  },
  { client: true, rate: { name: "my-modify", limit: 20, windowSec: 600 } },
);
