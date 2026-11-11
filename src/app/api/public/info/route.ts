import { api } from "@/lib/api";
import { getPublicInfo } from "@/services/publicInfo";

export const GET = api(async () => getPublicInfo());
