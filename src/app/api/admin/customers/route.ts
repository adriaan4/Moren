import { api } from "@/lib/api";
import { listCustomersWithStats } from "@/services/customerService";

export const GET = api(async (req) => ({ customers: await listCustomersWithStats(req.nextUrl.searchParams.get("q") ?? undefined) }), { admin: true });
