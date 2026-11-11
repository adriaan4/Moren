import { api, parseBody } from "@/lib/api";
import { weeklyScheduleSchema } from "@/schemas";
import { getWeekly, listExceptions, saveWeekly } from "@/repositories/scheduleRepo";
import { revalidatePath } from "next/cache";

export const GET = api(async () => ({ weekly: await getWeekly(), exceptions: await listExceptions() }), { admin: true });

export const PUT = api(
  async (req) => {
    const weekly = await parseBody(req, weeklyScheduleSchema);
    await saveWeekly({ ...(await getWeekly()), ...weekly });
    revalidatePath("/", "layout");
    return { weekly: await getWeekly() };
  },
  { admin: true },
);
