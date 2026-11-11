import { api, parseBody } from "@/lib/api";
import { notFound } from "@/lib/errors";
import { customerPatchSchema } from "@/schemas";
import { updateCustomer } from "@/repositories/customerRepo";
import { eraseCustomer, getCustomerDetail } from "@/services/customerService";

export const GET = api(async (_req, ctx) => getCustomerDetail((await ctx.params).id), { admin: true });

export const PATCH = api(
  async (req, ctx) => {
    const body = await parseBody(req, customerPatchSchema);
    const customer = await updateCustomer((await ctx.params).id, body);
    if (!customer) throw notFound("Cliente no encontrado");
    return { customer };
  },
  { admin: true },
);

/** Supresión de datos personales (RGPD): elimina al cliente y anonimiza su historial. */
export const DELETE = api(async (_req, ctx) => eraseCustomer((await ctx.params).id), { admin: true });
