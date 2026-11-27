-- AlterTable
ALTER TABLE "invitation" ALTER COLUMN "project_id" DROP NOT NULL,
ALTER COLUMN "role" DROP NOT NULL;

-- Hand-written: an invitation with no project (an "account invitation") has no role either, and the other way round.
-- Existing rows all have both, so they pass. Prisma cannot express a CHECK constraint.
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_project_and_role_together" CHECK (("project_id" IS NULL) = ("role" IS NULL));

-- Hand-written: at most one Pending account invitation per email. The index on (project_id, email) does not cover
-- it because NULLs are distinct in a unique index. Prisma cannot express a partial unique index.
CREATE UNIQUE INDEX "invitation_email_account_pending_key" ON "invitation"("email") WHERE "status" = 'PENDING' AND "project_id" IS NULL;
