import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { OtpCode } from "../models/OtpCode.js";
import { sendOtpEmail } from "./emailService.js";

const expirationMinutes = Number(process.env.OTP_EXPIRES_MINUTES || 10);
const maximumAttempts = 5;

const normalizeEmail = (email) => email.trim().toLowerCase();

const createSixDigitCode = () => {
  const minimum = 100000;
  const maximum = 999999;
  return String(crypto.randomInt(minimum, maximum + 1));
};

export const createAndSendOtp = async ({ email, purpose }) => {
  const normalizedEmail = normalizeEmail(email);
  const code = createSixDigitCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

  await OtpCode.deleteMany({
    email: normalizedEmail,
    purpose,
  });

  await OtpCode.create({
    email: normalizedEmail,
    codeHash,
    purpose,
    expiresAt,
  });

  await sendOtpEmail({
    email: normalizedEmail,
    code,
    purpose,
  });
};

export const verifyOtp = async ({ email, code, purpose }) => {
  const normalizedEmail = normalizeEmail(email);
  const otp = await OtpCode.findOne({
    email: normalizedEmail,
    purpose,
  }).sort({ createdAt: -1 });

  if (!otp) {
    return { valid: false, message: "The code is invalid or expired." };
  }

  if (otp.expiresAt <= new Date()) {
    await otp.deleteOne();
    return { valid: false, message: "The code is invalid or expired." };
  }

  if (otp.attempts >= maximumAttempts) {
    await otp.deleteOne();
    return { valid: false, message: "Too many attempts. Request a new code." };
  }

  const matches = await bcrypt.compare(code, otp.codeHash);

  if (!matches) {
    otp.attempts += 1;
    await otp.save();
    return { valid: false, message: "The code is incorrect." };
  }

  await otp.deleteOne();
  return { valid: true };
};
