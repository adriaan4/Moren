import { api, parseBody } from "@/lib/api";
import { createBookingSchema } from "@/schemas";
import { createBooking, publicView } from "@/services/bookingService";

/** Crear una reserva (público, con limitador de peticiones). */
export const POST = api(
  async (req) => {
    const body = await parseBody(req, createBookingSchema);
    const booking = await createBooking(
      { serviceId: body.serviceId, date: body.date, time: body.time, customer: body.customer, notes: body.notes },
      "web",
    );
    return { booking: publicView(booking), accessKey: booking.accessKey };
  },
  { rate: { name: "book", limit: 10, windowSec: 600 } },
);
