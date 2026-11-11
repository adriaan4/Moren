import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AppError, forbidden } from "@/lib/errors";
import { getSession, requireAdmin, requireClient } from "@/services/authService";
import * as authRepo from "@/repositories/authRepo";
import type { SessionData } from "@/types";

export type RouteCtx = { params: Promise<Record<string, string>> };

interface Options {
  admin?: boolean;
  client?: boolean;
  /** Limitador por IP: máximo `limit` peticiones cada `windowSec` segundos */
  rate?: { name: string; limit: number; windowSec: number };
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Protección CSRF: las peticiones que modifican datos deben venir del propio sitio. */
function assertSameOrigin(req: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return; // las cookies son SameSite=Lax: un envío cross-site no llevaría la sesión
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Origen no válido");
  }
  if (originHost !== host) throw forbidden("Origen no permitido");
}

async function reportError(err: unknown, req: NextRequest) {
  console.error(`[api:error] ${req.method} ${req.nextUrl.pathname}`, err);
  const hook = process.env.ERROR_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `🚨 Morén API ${req.method} ${req.nextUrl.pathname}: ${err instanceof Error ? err.message : String(err)}` }),
    });
  } catch {
    /* sin monitorización disponible */
  }
}

export function api(
  handler: (req: NextRequest, ctx: RouteCtx, session: SessionData | null) => Promise<unknown>,
  opts: Options = {},
) {
  return async (req: NextRequest, ctx: RouteCtx): Promise<Response> => {
    try {
      assertSameOrigin(req);
      if (opts.rate) {
        const n = await authRepo.hit(`${opts.rate.name}:${clientIp(req)}`, opts.rate.windowSec);
        if (n > opts.rate.limit) throw new AppError(429, "RATE_LIMIT", "Demasiadas peticiones. Inténtalo de nuevo en unos minutos.");
      }
      let session: SessionData | null = null;
      if (opts.admin) session = await requireAdmin();
      else if (opts.client) session = await requireClient();
      else session = await getSession();

      const result = await handler(req, ctx, session);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      if (err instanceof AppError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      if (err instanceof ZodError) {
        return NextResponse.json({ error: err.issues[0]?.message ?? "Datos no válidos", code: "VALIDATION", issues: err.issues }, { status: 400 });
      }
      await reportError(err, req);
      return NextResponse.json({ error: "Error interno del servidor", code: "INTERNAL" }, { status: 500 });
    }
  };
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError(400, "BAD_JSON", "Cuerpo de la petición no válido");
  }
  return schema.parse(json);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.infer<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams));
}
