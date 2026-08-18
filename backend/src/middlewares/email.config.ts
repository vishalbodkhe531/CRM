import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "../config/logger";

type SendPasswordResetOtpInput = {
  to: string;
  otp: string;
};

const OTP_EXPIRY_MINUTES = 10;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getMailConfig = () => {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return {
    apiKey: env.RESEND_API_KEY,
    fromAddress: env.RESEND_FROM_ADDRESS,
    fromName: env.RESEND_FROM_NAME,
  };
};

const createResendClient = () => {
  const config = getMailConfig();
  return new Resend(config.apiKey);
};

export const sendPasswordResetOtpEmail = async ({
  to,
  otp,
}: SendPasswordResetOtpInput): Promise<void> => {
  const config = getMailConfig();
  const resend = createResendClient();
  const safeFromName = escapeHtml(config.fromName);
  const safeOtp = escapeHtml(otp);
  const fromName = config.fromName.replace(/"/g, "'");

  const { data, error } = await resend.emails.send({
    from: `"${fromName}" <${config.fromAddress}>`,
    to,
    subject: "Password Reset OTP",
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6">
        <h2 style="margin:0 0 16px">${safeFromName}</h2>
        <p>You requested a password reset.</p>
        <p>Use this OTP to reset your CRM password:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:20px 0">${safeOtp}</p>
        <p>This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p>If you did not request this password reset, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Password reset OTP email failed");
  }

  logger.info("Password reset OTP email handed to mail provider", {
    to,
    from: config.fromAddress,
    messageId: data?.id,
  });
};
