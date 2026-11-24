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
