import { api } from "@/lib/api";
import { endSession } from "@/services/authService";

export const POST = api(async () => {
  await endSession();
});
