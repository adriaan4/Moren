import { revalidatePath } from "next/cache";
import { api, parseBody } from "@/lib/api";
import { reorderSchema, serviceCreateSchema } from "@/schemas";
import { createService, listServices, reorderServices } from "@/repositories/serviceRepo";

export const GET = api(async () => ({ services: await listServices() }), { admin: true });

/** Crear servicio: basta con nombre y precio (en céntimos). */
export const POST = api(
  async (req) => {
    const body = await parseBody(req, serviceCreateSchema);
    const service = await createService(body);
    revalidatePath("/", "layout");
    return { service };
  },
  { admin: true },
);

/** Reordenar: recibe la lista de ids en el orden deseado. */
export const PUT = api(
  async (req) => {
    const { ids } = await parseBody(req, reorderSchema);
    await reorderServices(ids);
    revalidatePath("/", "layout");
    return { services: await listServices() };
  },
  { admin: true },
);
