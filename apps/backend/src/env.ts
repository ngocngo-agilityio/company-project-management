import { normalizeEmail } from "@board/shared";
import { z } from "zod";

// Empty strings (e.g. `PORT=` copied from .env.example) are treated as unset.
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const DEFAULT_COMPANY_TIMEZONE = "Asia/Ho_Chi_Minh";

/** True for a time zone name the runtime knows (IANA, e.g. Asia/Ho_Chi_Minh or UTC). */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(3000)),
  HOST: z.preprocess(emptyToUndefined, z.string().default("127.0.0.1")),
  // Origin of the web app allowed to call the API (CORS), e.g. https://web.example.com. Unset = no CORS.
  WEB_ORIGIN: z.preprocess(emptyToUndefined, z.url().optional()),
  // Optional until something actually needs the DB; still validated when set.
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// URL")
      .optional(),
  ),
  // First Super Admin created by `pnpm db:seed`. Optional for the server, required by the seed.
  SUPER_ADMIN_EMAIL: z.preprocess(
    emptyToUndefined,
    z.string().trim().pipe(z.email()).transform(normalizeEmail).optional(),
  ),
  SUPER_ADMIN_NAME: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  // Company time zone saved by `pnpm db:seed` into `company_setting`. Must be an IANA name.
  COMPANY_TIMEZONE: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .refine(isTimeZone, "must be an IANA time zone name, e.g. Asia/Ho_Chi_Minh")
      .default(DEFAULT_COMPANY_TIMEZONE),
  ),
  // Set to 1 to let `pnpm db:deploy` / `db:seed` run against a non-local database (never `db:migrate`).
  ALLOW_REMOTE_DB: z.preprocess(emptyToUndefined, z.enum(["0", "1"]).default("0")),
  // Google sign-in. All three are set together; the server requires them to start.
  GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  // Must match an authorized redirect URI in Google, e.g. https://api.example.com/auth/google/callback.
  GOOGLE_REDIRECT_URI: z.preprocess(emptyToUndefined, z.url().optional()),
  // 1 on Render: web and API are on different addresses, so the cookie is Secure + SameSite=None.
  // 0 (default) for local development over plain http: SameSite=Lax, not Secure.
  COOKIE_CROSS_SITE: z.preprocess(emptyToUndefined, z.enum(["0", "1"]).default("0")),
  // 1 when the API runs behind a proxy (Render): the client address comes from X-Forwarded-For,
  // so the rate limit counts each person apart. 0 (default) locally: the header could be forged.
  TRUST_PROXY: z.preprocess(emptyToUndefined, z.enum(["0", "1"]).default("0")),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${details}`);
  }
  return result.data;
}

/** Loads the repo-root .env (if present) into process.env. Existing variables are not overridden. */
export function loadDotEnv(file: URL | string = new URL("../../../.env", import.meta.url)): void {
  try {
    process.loadEnvFile(file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

/** Loads the repo-root .env (if present) into process.env, then validates. */
export function loadEnv(): Env {
  loadDotEnv();
  return parseEnv(process.env);
}
