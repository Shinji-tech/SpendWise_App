const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FieldError = string | null;

export function validateName(value: string): FieldError {
  const v = value.trim();
  if (!v) return "Please enter your name.";
  if (v.length < 2) return "Your name should be at least 2 characters.";
  return null;
}

export function validateEmail(value: string): FieldError {
  const v = value.trim();
  if (!v) return "Please enter your email.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return null;
}

/** Sign-up rule from the design: at least 8 characters, including a number. */
export function validateNewPassword(value: string): FieldError {
  if (!value) return "Please create a password.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/\d/.test(value)) return "Include at least one number.";
  return null;
}

export function validateRequiredPassword(value: string): FieldError {
  if (!value) return "Please enter your password.";
  return null;
}
