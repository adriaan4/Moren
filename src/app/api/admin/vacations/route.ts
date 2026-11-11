import { z } from "zod";
import { revalidatePath } from "next/cache";
import { api, parseBody, parseQuery } from "@/lib/api";
import { closureSchema } from "@/schemas";
import { addClosure, deleteClosure, listClosures } from "@/repositories/scheduleRepo";

export const GET = api(async () => ({ closures: await listClosures() }), { admin: true });

/**
 * Las vacaciones se guardan como un único rango: la disponibilidad lo consulta en tiempo real,
 * así que bloquea todos los días sin tener que crearlos uno a uno. Las citas ya existentes
 * se conservan y siguen visibles para el administrador.
 */
export const POST = api(
  async (req) => {
    const c = await parseBody(req, closureSchema);
    const closure = await addClosure(c);
    revalidatePath("/", "layout");
    return { closure };
  },
  { admin: true },
);

export const DELETE = api(
  async (req) => {
    const { id } = parseQuery(req, z.object({ id: z.string().min(1) }));
    await deleteClosure(id);
    revalidatePath("/", "layout");
  },
  { admin: true },
);
