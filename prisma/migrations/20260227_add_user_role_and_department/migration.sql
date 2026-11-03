-- Add USER role to UserRole enum
ALTER TYPE "UserRole" ADD VALUE 'USER';

-- Add department column to User table
ALTER TABLE "User" ADD COLUMN "department" "Department";

-- Create index on department column
CREATE INDEX "User_department_idx" ON "User"("department");
