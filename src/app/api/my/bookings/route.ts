import { api } from "@/lib/api";
import { getSettings } from "@/repositories/settingsRepo";
import { listByCustomer } from "@/repositories/bookingRepo";
import { getCustomer } from "@/repositories/customerRepo";
import { isUpcoming } from "@/services/bookingService";
import { minutesUntil, toMinutes } from "@/lib/time";

/** Citas del cliente autenticado (solo las suyas). */
export const GET = api(
  async (_req, _ctx, session) => {
    const customerId = session!.sub;
    const [bookings, customer, settings] = await Promise.all([listByCustomer(customerId), getCustomer(customerId), getSettings()]);
    const view = bookings.map((b) => {
      const left = minutesUntil(b.date, toMinutes(b.time));
      return {
        id: b.id,
        status: b.status,
        date: b.date,
        time: b.time,
        endTime: b.endTime,
        service: b.service,
        upcoming: isUpcoming(b),
        canModify: isUpcoming(b) && left >= settings.modifyMinHours * 60,
        canCancel: isUpcoming(b) && left >= settings.cancelMinHours * 60,
      };
    });
    return {
      customer: customer ? { firstName: customer.firstName, lastName: customer.lastName, email: customer.email } : null,
      policy: {
        cancelMinHours: settings.cancelMinHours,
        modifyMinHours: settings.modifyMinHours,
        allowServiceChange: settings.allowServiceChange,
        phone: settings.phone,
      },
      upcoming: view.filter((b) => b.upcoming).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
      history: view.filter((b) => !b.upcoming),
    };
  },
  { client: true },
);
