/**
 * Envío de correo mediante la API REST de Resend (sin dependencias adicionales).
 * Sin RESEND_API_KEY el mensaje se escribe en el log (útil en desarrollo).
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Morén Peluquería <onboarding@resend.dev>";
  if (!key) {
    console.log(`[email:dev] → ${msg.to} | ${msg.subject}\n${msg.text}`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) {
      console.error("[email] Resend respondió", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] error de red", err);
    return false;
  }
}
