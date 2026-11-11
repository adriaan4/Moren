import { api, parseBody } from "@/lib/api";
import { requestLinkSchema } from "@/schemas";
import { siteUrl } from "@/lib/env";
import { newSecret } from "@/lib/ids";
import { sendEmail } from "@/lib/email";
import { magicLinkEmail } from "@/lib/emailTemplates";
import { getCustomerByEmail } from "@/repositories/customerRepo";
import { getSettings } from "@/repositories/settingsRepo";
import { saveMagicToken } from "@/repositories/authRepo";

/**
 * Envía un enlace seguro al correo. La respuesta es siempre la misma exista o no el cliente,
 * para no revelar qué correos están registrados.
 */
export const POST = api(
  async (req) => {
    const { email } = await parseBody(req, requestLinkSchema);
    const customer = await getCustomerByEmail(email);
    if (customer) {
      const token = newSecret(24);
      await saveMagicToken(token, customer.id, 60 * 30);
      const mail = magicLinkEmail(await getSettings(), `${siteUrl()}/api/my/verify?token=${token}`, customer.firstName);
      await sendEmail({ to: customer.email, ...mail });
    }
    return { ok: true };
  },
  { rate: { name: "magic", limit: 5, windowSec: 900 } },
);
