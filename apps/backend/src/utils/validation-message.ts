import type { ZodError } from "zod";

/** A short, readable 400 message from a zod refusal. Names the field and the rule, never the value sent. */
export function validationMessage(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`).join("; ");
}
