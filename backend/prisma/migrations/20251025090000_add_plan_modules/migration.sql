-- Create table for linking career plans and modules
CREATE TABLE "career_plan_modules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "careerPlanId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "career_plan_modules_careerPlanId_fkey" FOREIGN KEY ("careerPlanId") REFERENCES "career_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "career_plan_modules_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module_routines" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "career_plan_modules_careerPlanId_moduleId_key" ON "career_plan_modules" ("careerPlanId", "moduleId");
