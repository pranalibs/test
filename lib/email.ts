import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

export async function sendOtpEmail({
  to,
  otp,
}: {
  to: string;
  otp: string;
}) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your verification code: ${otp}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1A1A1A;">
        <h2 style="color: #C96442;">Verification Code</h2>
        <p>Use the code below to log in. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size: 40px; font-weight: bold; letter-spacing: 12px; text-align: center; padding: 24px; background: #F7F5F2; border-radius: 12px; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #8B7E74; font-size: 13px;">If you didn't request this code, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E8E3DC; margin: 24px 0;" />
        <p style="color: #8B7E74; font-size: 12px;">Customer Management Platform</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}

export async function sendSubscriptionExpiryEmail({
  customerEmail,
  customerName,
  deviceName,
  deviceId,
  subscriptionEnd,
  daysRemaining,
}: {
  customerEmail: string;
  customerName: string;
  deviceName: string;
  deviceId: string;
  subscriptionEnd: string;
  daysRemaining: number;
}) {
  const subject = `Subscription expiring in ${daysRemaining} days — ${deviceName}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
      <h2 style="color: #C96442;">Subscription Expiry Notice</h2>
      <p>Hello ${customerName},</p>
      <p>Your subscription for <strong>${deviceName}</strong> (ID: ${deviceId}) is expiring in <strong>${daysRemaining} days</strong> on <strong>${subscriptionEnd}</strong>.</p>
      <p>Please contact your administrator to renew your subscription before it expires.</p>
      <hr style="border: none; border-top: 1px solid #E8E3DC; margin: 24px 0;" />
      <p style="color: #8B7E74; font-size: 12px;">Customer Management Platform</p>
    </div>
  `;

  // Send to customer
  await resend.emails.send({
    from: FROM_EMAIL,
    to: customerEmail,
    subject,
    html,
  });

  // Send to admin
  await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `[Admin] ${subject} — Customer: ${customerName} (${customerEmail})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
        <h2 style="color: #C96442;">Admin Alert: Subscription Expiry</h2>
        <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
        <p><strong>Device:</strong> ${deviceName} (ID: ${deviceId})</p>
        <p><strong>Expires in:</strong> ${daysRemaining} days (${subscriptionEnd})</p>
      </div>
    `,
  });
}
