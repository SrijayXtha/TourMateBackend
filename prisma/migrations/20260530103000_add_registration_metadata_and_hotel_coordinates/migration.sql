-- AlterTable
ALTER TABLE "guide"
ADD COLUMN "experience_label" VARCHAR(50),
ADD COLUMN "specialization" VARCHAR(150),
ADD COLUMN "license_document" TEXT;

-- AlterTable
ALTER TABLE "hotel"
ADD COLUMN "latitude" DECIMAL(10, 7),
ADD COLUMN "longitude" DECIMAL(10, 7),
ADD COLUMN "registration_number" VARCHAR(120),
ADD COLUMN "license_document" TEXT;
