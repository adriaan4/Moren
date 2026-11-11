import { z } from "zod";
import { api, parseBody } from "@/lib/api";
import { changeAdminPassword } from "@/services/authService";

export const GET = api(async (_req, _ctx, s) => ({ username: s!.sub }), { admin: true });

const pwSchema = z.object({ current: z.string().min(1), next: z.string().min(10).max(200) });

/** Cambio de contraseña del administrador. */
export const PUT = api(
  async (req, _ctx, s) => {
    const { current, next } = await parseBody(req, pwSchema);
    await changeAdminPassword(s!.sub, current, next);
  },
  { admin: true, rate: { name: "pw", limit: 5, windowSec: 900 } },
);
