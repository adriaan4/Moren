import { api, parseBody, parseQuery } from "@/lib/api";
import { adminCreateBookingSchema, bookingListQuerySchema } from "@/schemas";
import { createBooking } from "@/services/bookingService";
import { queryBookings } from "@/services/adminBookingQuery";

export const GET = api(
  async (req) => {
    const q = parseQuery(req, bookingListQuerySchema);
    return queryBookings(q);
  },
  { admin: true },
);

/** Crear cita manualmente (el administrador puede saltarse antelación y límite de días). */
export const POST = api(
  async (req) => {
    const body = await parseBody(req, adminCreateBookingSchema);
    const booking = await createBooking(
      { serviceId: body.serviceId, date: body.date, time: body.time, customer: body.customer, notes: body.notes, status: body.status },
      "admin",
    );
    return { booking };
  },
  { admin: true },
);
