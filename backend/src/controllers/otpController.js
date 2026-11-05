import { email, otp } from "../utils/validation.js";
import { createAndSendOtp, verifyOtp } from "../services/otpService.js";

const allowedPurposes = ["login", "register", "password-reset"];

const isPurposeAllowed = (purpose) => allowedPurposes.includes(purpose);

export const requestOtp = async (request, response) => {
  const { email: address, purpose = "login" } = request.body;

  if (!email(address)) {
    return response.status(400).json({
      message: "A valid email address is required.",
    });
  }

  if (!isPurposeAllowed(purpose)) {
    return response.status(400).json({
      message: "The OTP purpose is not supported.",
    });
  }

  await createAndSendOtp({
    email: address,
    purpose,
  });

  return response.status(202).json({
    message: "A verification code has been sent if the email can receive mail.",
  });
};

export const confirmOtp = async (request, response) => {
  const { email: address, code, purpose = "login" } = request.body;

  if (!email(address) || !otp(code) || !isPurposeAllowed(purpose)) {
    return response.status(400).json({
      message: "Email, six-digit code, and valid purpose are required.",
    });
  }

  const result = await verifyOtp({
    email: address,
    code,
    purpose,
  });

  if (!result.valid) {
    return response.status(400).json({
      message: result.message,
    });
  }

  return response.json({
    verified: true,
    message: "Email verification completed.",
  });
};
