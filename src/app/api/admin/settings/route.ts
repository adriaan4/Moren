import { revalidatePath } from "next/cache";
import { api, parseBody } from "@/lib/api";
import { settingsSchema } from "@/schemas";
import { getSettings, saveSettings } from "@/repositories/settingsRepo";

export const GET = api(async () => ({ settings: await getSettings() }), { admin: true });

export const PUT = api(
  async (req) => {
    const body = await parseBody(req, settingsSchema);
    const settings = await saveSettings(body);
    revalidatePath("/", "layout");
    return { settings };
  },
  { admin: true },
);
