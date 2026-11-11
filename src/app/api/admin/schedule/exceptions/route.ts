import { z } from "zod";
import { api, parseBody, parseQuery } from "@/lib/api";
import { badRequest } from "@/lib/errors";
import { eachDate } from "@/lib/time";
import { dateStr, exceptionSchema } from "@/schemas";
import { deleteException, setException } from "@/repositories/scheduleRepo";
import { revalidatePath } from "next/cache";

/** Crea excepciones para una fecha o un rango (p. ej. horario especial de una semana entera). */
export const POST = api(
  async (req) => {
    const b = await parseBody(req, exceptionSchema);
    const to = b.dateTo ?? b.dateFrom;
    if (to < b.dateFrom) throw badRequest("La fecha final es anterior a la inicial");
    if (!b.closed && !b.ranges.length) throw badRequest("Añade al menos una franja horaria o marca el día como cerrado");
    const dates = eachDate(b.dateFrom, to);
    if (dates.length > 120) throw badRequest("Rango demasiado largo (máx. 120 días)");
    for (const date of dates) await setException({ date, closed: b.closed, ranges: b.closed ? [] : b.ranges, note: b.note });
    revalidatePath("/", "layout");
    return { count: dates.length };
  },
  { admin: true },
);

export const DELETE = api(
  async (req) => {
    const { date } = parseQuery(req, z.object({ date: dateStr }));
    await deleteException(date);
    revalidatePath("/", "layout");
  },
  { admin: true },
);
