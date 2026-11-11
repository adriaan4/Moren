import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

/** Las rutas /api/cron/* solo aceptan "Authorization: Bearer <CRON_SECRET>" (Vercel Cron lo añade solo). */
export function assertCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError(503, "CRON_NOT_CONFIGURED", "CRON_SECRET no está configurado");
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AppError(401, "UNAUTHORIZED", "No autorizado");
}
