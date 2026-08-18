DROP INDEX IF EXISTS "Prospect_prospectNo_key";

CREATE UNIQUE INDEX "Prospect_organizationId_prospectNo_key"
ON "Prospect"("organizationId", "prospectNo");
