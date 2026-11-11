import { NextResponse, type NextRequest } from "next/server";
import { readMagicToken, hit } from "@/repositories/authRepo";
import { getCustomer } from "@/repositories/customerRepo";
import { startSession } from "@/services/authService";
import { clientIp } from "@/lib/api";
import { siteUrl } from "@/lib/env";

/** Enlace del correo: valida el token, abre sesión de cliente y redirige a "Mis citas". */
export async function GET(req: NextRequest) {
  const base = siteUrl();
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const attempts = await hit(`verify:${clientIp(req)}`, 600);
  if (attempts > 30 || token.length < 16) return NextResponse.redirect(`${base}/mis-citas?error=enlace`);
  const customerId = await readMagicToken(token);
  const customer = customerId ? await getCustomer(customerId) : null;
  if (!customer) return NextResponse.redirect(`${base}/mis-citas?error=enlace`);
  await startSession("client", customer.id);
  return NextResponse.redirect(`${base}/mis-citas`);
}
