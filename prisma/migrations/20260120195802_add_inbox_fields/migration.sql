-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false;
