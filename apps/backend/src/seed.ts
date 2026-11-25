import { normalizeEmail } from "@board/shared";

export interface SeedUserClient {
  user: {
    upsert(args: {
      where: { email: string };
      update: Record<string, never>;
      create: { email: string; name: string; isSuperAdmin: true };
    }): Promise<{ id: string; email: string }>;
  };
}

/**
 * Creates the first Super Admin. Safe to repeat: an existing user with this email is left untouched
 * (not renamed, not promoted or reactivated), and no second row is created.
 */
export async function seedSuperAdmin(db: SeedUserClient, input: { email: string; name?: string | undefined }) {
  const email = normalizeEmail(input.email);
  const name = input.name?.trim() || email.split("@")[0]!;
  return db.user.upsert({ where: { email }, update: {}, create: { email, name, isSuperAdmin: true } });
}

export interface SeedSettingClient {
  companySetting: {
    upsert(args: {
      where: { id: 1 };
      update: Record<string, never>;
      create: { id: 1; timezone: string };
    }): Promise<{ id: number; timezone: string }>;
  };
}

/**
 * Creates the single `company_setting` row. Safe to repeat: an existing row is left untouched,
 * so a time zone changed later in the app is not reset by a new seed run.
 */
export async function seedCompanySetting(db: SeedSettingClient, input: { timezone: string }) {
  return db.companySetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1, timezone: input.timezone } });
}
