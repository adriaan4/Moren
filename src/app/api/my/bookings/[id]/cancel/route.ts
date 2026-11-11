import { api } from "@/lib/api";
import { cancelBooking, publicView } from "@/services/bookingService";

export const POST = api(
  async (_req, ctx, session) => {
    const { id } = await ctx.params;
    const booking = await cancelBooking(id, { role: "client", customerId: session!.sub });
    return { booking: publicView(booking) };
  },
  { client: true, rate: { name: "my-cancel", limit: 20, windowSec: 600 } },
);
