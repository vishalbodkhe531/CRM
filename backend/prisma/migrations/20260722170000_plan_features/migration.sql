-- Move plan limits and toggles from COLUMNS to ROWS.
--
-- This is a data migration as well as a schema one. Every step that adds
-- structure runs before the step that removes it, so existing values are copied
-- into their new home BEFORE the old columns are dropped. Running the drops
-- first would silently discard every tenant's seat limit.

-- ---------------------------------------------------------------- new tables
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "valueInt" INTEGER,
    "valueBool" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionFeatureOverride" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "valueInt" INTEGER,
    "valueBool" BOOLEAN,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionFeatureOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanFeature_planId_featureKey_key" ON "PlanFeature"("planId", "featureKey");
CREATE INDEX "PlanFeature_featureKey_idx" ON "PlanFeature"("featureKey");
CREATE UNIQUE INDEX "SubscriptionFeatureOverride_subscriptionId_featureKey_key" ON "SubscriptionFeatureOverride"("subscriptionId", "featureKey");

ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubscriptionFeatureOverride" ADD CONSTRAINT "SubscriptionFeatureOverride_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------ new plan columns
-- slug arrives nullable so existing rows can be filled before the NOT NULL.
ALTER TABLE "Plan" ADD COLUMN "slug" TEXT;
ALTER TABLE "Plan" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- RENAME, not drop-and-add: dropping would take every existing value with it.
ALTER TABLE "Plan" RENAME COLUMN "interval" TO "billingCycle";

UPDATE "Plan" SET "slug" = lower(replace("code", '_', '-')) WHERE "slug" IS NULL;

ALTER TABLE "Plan" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- ------------------------------------------------------- backfill plan limits
-- NULL is preserved as NULL: it means UNLIMITED, and coercing it to 0 would
-- mean "none allowed" — the difference between an enterprise plan and a locked
-- account.
INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "valueInt", "updatedAt")
SELECT gen_random_uuid(), "id", 'MAX_USERS', "seatLimit", CURRENT_TIMESTAMP FROM "Plan";

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "valueInt", "updatedAt")
SELECT gen_random_uuid(), "id", 'MAX_LEADS', "leadLimit", CURRENT_TIMESTAMP FROM "Plan";

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "valueInt", "updatedAt")
SELECT gen_random_uuid(), "id", 'MAX_QUOTATIONS', "quotationLimit", CURRENT_TIMESTAMP FROM "Plan";

-- These two had no column, so every plan starts unlimited.
INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "valueInt", "updatedAt")
SELECT gen_random_uuid(), "id", 'MAX_PROSPECTS', NULL, CURRENT_TIMESTAMP FROM "Plan";

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "valueInt", "updatedAt")
SELECT gen_random_uuid(), "id", 'MAX_ITEMS', NULL, CURRENT_TIMESTAMP FROM "Plan";

-- ------------------------------------------------------ backfill plan toggles
-- Every existing tenant currently has all of these. Seeding them true keeps that
-- true: a migration must not quietly take a feature away from a paying customer.
INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "valueBool", "updatedAt")
SELECT gen_random_uuid(), "id", 'AUDIT_LOG_ACCESS', true, CURRENT_TIMESTAMP FROM "Plan";

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "valueBool", "updatedAt")
SELECT gen_random_uuid(), "id", 'ANNOUNCEMENTS', true, CURRENT_TIMESTAMP FROM "Plan";

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "valueBool", "updatedAt")
SELECT gen_random_uuid(), "id", 'QUOTATION_PDF', true, CURRENT_TIMESTAMP FROM "Plan";

-- -------------------------------------------------- backfill per-org overrides
-- The single hard-coded seatLimitOverride column becomes an ordinary override
-- row. Only rows that actually had a value are carried across.
INSERT INTO "SubscriptionFeatureOverride" ("id", "subscriptionId", "featureKey", "valueInt", "note", "updatedAt")
SELECT gen_random_uuid(), "id", 'MAX_USERS', "seatLimitOverride",
       'Migrated from the previous seatLimitOverride column.', CURRENT_TIMESTAMP
FROM "Subscription"
WHERE "seatLimitOverride" IS NOT NULL;

-- --------------------------------------------------- fix the grandfathered plan
-- It was marked inactive purely to hide it from the picker, which mislabelled a
-- plan two live organizations are actually on. It is assignable (isActive) but
-- off the menu (isPublic = false) — which is what it always meant.
UPDATE "Plan" SET "isActive" = true, "isPublic" = false WHERE "code" = 'GRANDFATHERED';

-- ------------------------------------------------------------- drop old shape
DROP INDEX IF EXISTS "Plan_isActive_sortOrder_idx";
CREATE INDEX "Plan_isActive_isPublic_sortOrder_idx" ON "Plan"("isActive", "isPublic", "sortOrder");

ALTER TABLE "Plan" DROP COLUMN "seatLimit";
ALTER TABLE "Plan" DROP COLUMN "leadLimit";
ALTER TABLE "Plan" DROP COLUMN "quotationLimit";
-- Nothing ever measured storage, so this column advertised a limit the product
-- could not apply. It is dropped rather than migrated to a feature key.
ALTER TABLE "Plan" DROP COLUMN "storageLimitMb";
ALTER TABLE "Plan" DROP COLUMN "features";

ALTER TABLE "Subscription" DROP COLUMN "seatLimitOverride";
