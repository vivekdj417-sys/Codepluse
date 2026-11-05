export const text = (value, max = 120) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.trim().length <= max;

export const email = (value) =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const otp = (value) =>
  typeof value === "string" && /^\d{6}$/.test(value);
