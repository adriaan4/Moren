/**
 * Envío de correo. Orden de prioridad:
 *   1) Resend (RESEND_API_KEY)                       → recomendado en producción con dominio propio
 *   2) Gmail por SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) → gratis y sin dominio (límite ~500 correos/día)
 *   3) Ninguno → el mensaje se escribe en el log (desarrollo)
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendWithResend(msg: EmailMessage, key: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM ?? "Morén Peluquería <onboarding@resend.dev>";
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
    console.error("[email] error de red con Resend", err);
    return false;
  }
}

async function sendWithGmail(msg: EmailMessage, user: string, pass: string): Promise<boolean> {
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      // La contraseña de aplicación de Google se muestra con espacios; se quitan
      auth: { user, pass: pass.replace(/\s+/g, "") },
    });
    // Gmail siempre envía desde la propia cuenta; solo se personaliza el nombre visible
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME ?? "Morén Peluquería"}" <${user}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return true;
  } catch (err) {
    console.error("[email] error enviando con Gmail", err);
    return false;
  }
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) return sendWithResend(msg, resendKey);

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) return sendWithGmail(msg, gmailUser, gmailPass);

  console.log(`[email:dev] → ${msg.to} | ${msg.subject}\n${msg.text}`);
  return true;
}
