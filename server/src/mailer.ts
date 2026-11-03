/** Outgoing email, behind an interface so tests never send real mail. */
export type Mailer = {
  sendResetCode(to: { email: string; name: string }, code: string): Promise<void>;
};

/** Brevo transactional email API (https://developers.brevo.com/reference/sendtransacemail). */
export function createBrevoMailer(config: { apiKey: string; fromEmail: string; fromName: string }): Mailer {
  return {
    async sendResetCode(to, code) {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": config.apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          sender: { email: config.fromEmail, name: config.fromName },
          to: [{ email: to.email, name: to.name }],
          subject: `${code} is your AgriDrone reset code`,
          textContent:
            `Hi ${to.name},\n\nYour AgriDrone password reset code is ${code}.\n` +
            "It expires in 15 minutes and can be used once.\n\n" +
            "If you didn't ask to reset your password, you can ignore this email.",
          htmlContent:
            `<div style="font-family:sans-serif;max-width:420px">` +
            `<p>Hi ${escapeHtml(to.name)},</p><p>Your AgriDrone password reset code is:</p>` +
            `<p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0a3326">${code}</p>` +
            `<p>It expires in 15 minutes and can be used once.</p>` +
            `<p style="color:#64706a">If you didn't ask to reset your password, you can ignore this email.</p></div>`,
        }),
      });
      if (!response.ok) throw new Error(`Brevo rejected the email (${response.status})`);
    },
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
