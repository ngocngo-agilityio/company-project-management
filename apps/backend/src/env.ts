import { normalizeEmail } from "@board/shared";
import { z } from "zod";

// Empty strings (e.g. `PORT=` copied from .env.example) are treated as unset.
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

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
  SUPER_ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.string().pipe(z.email()).transform(normalizeEmail).optional()),
  SUPER_ADMIN_NAME: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  // Set to 1 to let `pnpm db:deploy` / `db:seed` run against a non-local database (never `db:migrate`).
  ALLOW_REMOTE_DB: z.preprocess(emptyToUndefined, z.enum(["0", "1"]).default("0")),
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
