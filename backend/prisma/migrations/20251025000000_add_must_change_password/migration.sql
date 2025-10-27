-- Add mustChangePassword flag to users for forced password reset
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
