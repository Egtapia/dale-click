import validator from "validator";

export function cleanText(value, maxLength = 255) {
  const text = String(value ?? "").trim().slice(0, maxLength);
  return validator.escape(text);
}

export function cleanOptionalText(value, maxLength = 255) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "";
  }

  return cleanText(value, maxLength);
}

export function cleanEmail(email) {
  const value = String(email ?? "").trim().toLowerCase();
  const normalized = validator.normalizeEmail(value);

  return normalized || "";
}

export function cleanUsername(username) {
  const value = String(username ?? "").trim().slice(0, 50);
  return validator.escape(value);
}

export function cleanPhone(phone) {
  const value = String(phone ?? "").trim().slice(0, 20);
  return validator.escape(value);
}

export function isValidEmail(email) {
  return validator.isEmail(String(email ?? ""));
}

export function isValidPhone(phone) {
  return /^[0-9+\-\s()]{8,20}$/.test(String(phone ?? ""));
}

export function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6 && password.length <= 100;
}

export function cleanNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}