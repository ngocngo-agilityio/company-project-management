-- CreateTable
CREATE TABLE "company_setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "timezone" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_setting_pkey" PRIMARY KEY ("id")
);

-- Hand-written: company_setting holds exactly one row. Prisma cannot express a CHECK constraint.
ALTER TABLE "company_setting" ADD CONSTRAINT "company_setting_single_row" CHECK ("id" = 1);
