import sgMail from "@sendgrid/mail";

export async function sendEmail({ to, subject, text, attachments }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not set");
  }

  sgMail.setApiKey(apiKey);

  const safeAttachments = (attachments || []).map((att) => ({
    filename: att.filename,
    type: att.type || "application/pdf",
    disposition: att.disposition || "attachment",
    content:
      Buffer.isBuffer(att.content) ? att.content.toString("base64") : att.content
  }));

  await sgMail.send({
    to,
    from: process.env.SMTP_FROM,
    subject,
    text,
    attachments: safeAttachments
  });
}
