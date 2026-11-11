import { api } from "@/lib/api";
import { getStats } from "@/services/statsService";

export const GET = api(async () => getStats(), { admin: true });
