-- Add soft-delete fields to Prospect table.
-- Non-destructive: both columns are nullable so existing rows are unaffected.

ALTER TABLE "Prospect" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Prospect" ADD COLUMN "deletedById" TEXT;

ALTER TABLE "Prospect"
  ADD CONSTRAINT "Prospect_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Prospect_deletedAt_idx" ON "Prospect"("deletedAt");
