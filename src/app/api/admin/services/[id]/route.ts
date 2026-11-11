import { revalidatePath } from "next/cache";
import { api, parseBody } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { servicePatchSchema } from "@/schemas";
import { deleteService, updateService } from "@/repositories/serviceRepo";

/**
 * Editar un servicio no toca las reservas existentes: cada reserva guarda su propia copia
 * (nombre, precio, duración) tomada en el momento de reservar.
 */
export const PATCH = api(
  async (req, ctx) => {
    const { id } = await ctx.params;
    const body = await parseBody(req, servicePatchSchema);
    const service = await updateService(id, body);
    if (!service) throw notFound("Servicio no encontrado");
    revalidatePath("/", "layout");
    return { service };
  },
  { admin: true },
);

export const DELETE = api(
  async (_req, ctx) => {
    await deleteService((await ctx.params).id);
    revalidatePath("/", "layout");
  },
  { admin: true },
);
