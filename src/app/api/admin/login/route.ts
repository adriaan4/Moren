import { api, clientIp, parseBody } from "@/lib/api";
import { loginSchema } from "@/schemas";
import { adminLogin } from "@/services/authService";

export const POST = api(async (req) => {
  const { username, password } = await parseBody(req, loginSchema);
  await adminLogin(username, password, clientIp(req));
});
