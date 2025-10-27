/*
  Warnings:

  - You are about to alter the column `payload` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.
  - You are about to alter the column `activities` on the `collaborator_profiles` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "createdAt", "entity", "entityId", "id", "payload", "userId") SELECT "action", "createdAt", "entity", "entityId", "id", "payload", "userId" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE TABLE "new_collaborator_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "admissionDate" DATETIME NOT NULL,
    "activities" JSONB,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "collaborator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_collaborator_profiles" ("activities", "admissionDate", "createdAt", "fullName", "id", "notes", "updatedAt", "userId") SELECT "activities", "admissionDate", "createdAt", "fullName", "id", "notes", "updatedAt", "userId" FROM "collaborator_profiles";
DROP TABLE "collaborator_profiles";
ALTER TABLE "new_collaborator_profiles" RENAME TO "collaborator_profiles";
CREATE UNIQUE INDEX "collaborator_profiles_userId_key" ON "collaborator_profiles"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
