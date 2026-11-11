import { api, parseBody } from "@/lib/api";
import { adminBookingPatchSchema } from "@/schemas";
import { deleteBookingAdmin, getBookingOrThrow, rescheduleBooking, setBookingStatus, updateNotes } from "@/services/bookingService";

export const GET = api(async (_req, ctx) => ({ booking: await getBookingOrThrow((await ctx.params).id) }), { admin: true });

export const PATCH = api(
  async (req, ctx) => {
    const { id } = await ctx.params;
    const body = await parseBody(req, adminBookingPatchSchema);
    if (body.action === "reschedule") return { booking: await rescheduleBooking(id, body, { role: "admin" }) };
    if (body.action === "status") return { booking: await setBookingStatus(id, body.status) };
    return { booking: await updateNotes(id, body.notes) };
  },
  { admin: true },
);

export const DELETE = api(
  async (_req, ctx) => {
    await deleteBookingAdmin((await ctx.params).id);
  },
  { admin: true },
);
