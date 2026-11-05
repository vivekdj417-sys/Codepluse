import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === "true" || smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendOtpEmail = async ({ email, code, purpose }) => {
  const purposeText = {
    login: "complete your login",
    register: "verify your new account",
    "password-reset": "reset your password",
  }[purpose];

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your CodePulse verification code",
    text: `Your CodePulse code is ${code}. It expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes. Use it to ${purposeText}.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2>CodePulse verification</h2><p>Use this code to ${purposeText}:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.</p><p>If you did not request this, you can ignore this email.</p></div>`,
  });
};

export const verifyEmailConnection = async () => {
  await transporter.verify();
};
