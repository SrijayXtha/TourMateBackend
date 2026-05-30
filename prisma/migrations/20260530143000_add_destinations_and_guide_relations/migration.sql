-- AlterTable
ALTER TABLE "guide"
ADD COLUMN "languages" TEXT;

-- CreateTable
CREATE TABLE "destination" (
    "destination_id" SERIAL NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "description" TEXT,
    "image" TEXT,
    "category" VARCHAR(120),
    "popularity_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destination_pkey" PRIMARY KEY ("destination_id")
);

-- CreateTable
CREATE TABLE "guide_destination" (
    "id" SERIAL NOT NULL,
    "guide_id" INTEGER NOT NULL,
    "destination_id" INTEGER NOT NULL,

    CONSTRAINT "guide_destination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_request" (
    "request_id" SERIAL NOT NULL,
    "guide_id" INTEGER,
    "requester_name" VARCHAR(160),
    "requester_email" VARCHAR(255),
    "destination_name" VARCHAR(160) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "reason" TEXT NOT NULL,
    "image" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "status" VARCHAR(40) NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(6),
    "approved_destination_id" INTEGER,

    CONSTRAINT "destination_request_pkey" PRIMARY KEY ("request_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guide_destination_guide_id_destination_id_key" ON "guide_destination"("guide_id", "destination_id");

-- AddForeignKey
ALTER TABLE "guide_destination" ADD CONSTRAINT "guide_destination_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guide"("guide_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guide_destination" ADD CONSTRAINT "guide_destination_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destination"("destination_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "destination_request" ADD CONSTRAINT "destination_request_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guide"("guide_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "destination_request" ADD CONSTRAINT "destination_request_approved_destination_id_fkey" FOREIGN KEY ("approved_destination_id") REFERENCES "destination"("destination_id") ON DELETE SET NULL ON UPDATE NO ACTION;
