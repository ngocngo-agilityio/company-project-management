import { normalizeEmail } from "@board/shared";
import { z } from "zod";

export interface SampleUser {
  email: string;
  name: string;
  deactivated: boolean;
}

/** Fake people for trying the lists (`--fake`). `example.com` is reserved: nobody can sign in as these. */
export const FAKE_SAMPLE_USERS: readonly SampleUser[] = [
  { email: "an.nguyen@example.com", name: "An Nguyen", deactivated: false },
  { email: "binh.tran@example.com", name: "Binh Tran", deactivated: false },
  { email: "chi.le@example.com", name: "Chi Le (deactivated)", deactivated: true },
];

export interface SampleArgs {
  users: SampleUser[];
  /** `--yes`: the person running the script confirmed the database shown. */
  yes: boolean;
}

const emailSchema = z.email();

/** Reads `"Name <email>"` or a bare `email`. The name defaults to the part before `@`. */
export function parseSampleUser(arg: string): SampleUser {
  const match = /^\s*(.*?)\s*<([^<>]+)>\s*$/.exec(arg);
  const rawEmail = (match ? match[2]! : arg).trim();
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw new Error(`Not an email address: "${arg}". Use "Name <email>" or just the email.`);
  const email = normalizeEmail(parsed.data);
  return { email, name: match?.[1] || email.split("@")[0]!, deactivated: false };
}

/** Parses the command line: `"Name <email>"` values, `--fake`, `--yes`. Anything else is refused. */
export function parseSampleArgs(argv: string[]): SampleArgs {
  const users: SampleUser[] = [];
  let yes = false;
  let fake = false;
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg === "--yes") yes = true;
    else if (arg === "--fake") fake = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else users.push(parseSampleUser(arg));
  }
  if (fake) users.push(...FAKE_SAMPLE_USERS);
  if (users.length === 0) throw new Error('Give at least one person ("Name <email>") or use --fake.');
  return { users, yes };
}

/** The host of a database URL, and nothing else: the rest holds the user name and password. */
export function databaseHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "(unreadable URL)";
  }
}

export interface SeedSampleClient {
  user: {
    upsert(args: {
      where: { email: string };
      update: Record<string, never>;
      create: { email: string; name: string; deactivatedAt: Date | null };
    }): Promise<{ id: string; email: string }>;
  };
}

/**
 * Creates the people, leaving existing ones untouched (matched by email), so it is safe to repeat.
 * No Google id and no Super Admin flag: a real person gets their Google id on first sign-in,
 * which the gate allows once they belong to a project.
 */
export async function seedSampleUsers(db: SeedSampleClient, users: SampleUser[], now: Date = new Date()) {
  const done: { id: string; email: string }[] = [];
  for (const user of users) {
    done.push(
      await db.user.upsert({
        where: { email: user.email },
        update: {},
        create: { email: user.email, name: user.name, deactivatedAt: user.deactivated ? now : null },
      }),
    );
  }
  return done;
}
