/** Emails are compared and stored in lowercase, without surrounding spaces. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
