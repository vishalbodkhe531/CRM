-- Platform-wide settings.
--
-- One row, always. `id` is a plain TEXT primary key with no default rather than
-- a uuid: the application pins it to a known constant, so a second row cannot be
-- created by accident and every reader is guaranteed to see the same record.
--
-- Both foreign keys are ON DELETE SET NULL. Retiring a plan or removing the
-- super-admin who last edited settings must not cascade into deleting the
-- platform configuration itself.

CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "platformName" TEXT NOT NULL DEFAULT 'Emvesso CRM',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "auditRetentionDays" INTEGER,
    "defaultPlanId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlatformSetting"
    ADD CONSTRAINT "PlatformSetting_defaultPlanId_fkey"
    FOREIGN KEY ("defaultPlanId") REFERENCES "Plan"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlatformSetting"
    ADD CONSTRAINT "PlatformSetting_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the singleton so every read finds a row and the console never has to
-- special-case "settings do not exist yet". Defaults match the model.
INSERT INTO "PlatformSetting" ("id", "updatedAt")
VALUES ('platform', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
