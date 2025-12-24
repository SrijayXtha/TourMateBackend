-- CreateTable
CREATE TABLE "admin_action" (
    "action_id" SERIAL NOT NULL,
    "admin_id" INTEGER,
    "target_user_id" INTEGER,
    "action_type" VARCHAR(50),
    "action_description" TEXT,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_pkey" PRIMARY KEY ("action_id")
);

-- CreateTable
CREATE TABLE "booking" (
    "booking_id" SERIAL NOT NULL,
    "tourist_id" INTEGER,
    "guide_id" INTEGER,
    "hotel_id" INTEGER,
    "start_date" DATE,
    "end_date" DATE,
    "status" VARCHAR(50),
    "total_price" DECIMAL(10,2),

    CONSTRAINT "booking_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "guide" (
    "guide_id" INTEGER NOT NULL,
    "bio" TEXT,
    "experience_years" INTEGER,
    "license_number" VARCHAR(100),
    "verified_status" BOOLEAN DEFAULT false,

    CONSTRAINT "guide_pkey" PRIMARY KEY ("guide_id")
);

-- CreateTable
CREATE TABLE "hotel" (
    "hotel_id" INTEGER NOT NULL,
    "hotel_name" VARCHAR(200),
    "location" VARCHAR(200),
    "description" TEXT,
    "rating" DOUBLE PRECISION,

    CONSTRAINT "hotel_pkey" PRIMARY KEY ("hotel_id")
);

-- CreateTable
CREATE TABLE "incident_report" (
    "incident_id" SERIAL NOT NULL,
    "tourist_id" INTEGER,
    "booking_id" INTEGER,
    "incident_type" VARCHAR(50),
    "details" TEXT,
    "location" VARCHAR(200),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_report_pkey" PRIMARY KEY ("incident_id")
);

-- CreateTable
CREATE TABLE "review" (
    "review_id" SERIAL NOT NULL,
    "tourist_id" INTEGER,
    "guide_id" INTEGER,
    "hotel_id" INTEGER,
    "rating" INTEGER,
    "comment" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "sos_report" (
    "report_id" SERIAL NOT NULL,
    "tourist_id" INTEGER,
    "location" VARCHAR(200),
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" VARCHAR(30),

    CONSTRAINT "sos_report_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "tourist" (
    "tourist_id" INTEGER NOT NULL,
    "emergency_contact" VARCHAR(100),
    "preferences" TEXT,

    CONSTRAINT "tourist_pkey" PRIMARY KEY ("tourist_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "role" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "admin_action" ADD CONSTRAINT "admin_action_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_action" ADD CONSTRAINT "admin_action_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guide"("guide_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotel"("hotel_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_tourist_id_fkey" FOREIGN KEY ("tourist_id") REFERENCES "tourist"("tourist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guide" ADD CONSTRAINT "guide_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hotel" ADD CONSTRAINT "hotel_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "incident_report" ADD CONSTRAINT "incident_report_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "incident_report" ADD CONSTRAINT "incident_report_tourist_id_fkey" FOREIGN KEY ("tourist_id") REFERENCES "tourist"("tourist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_guide_id_fkey" FOREIGN KEY ("guide_id") REFERENCES "guide"("guide_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotel"("hotel_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_tourist_id_fkey" FOREIGN KEY ("tourist_id") REFERENCES "tourist"("tourist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sos_report" ADD CONSTRAINT "sos_report_tourist_id_fkey" FOREIGN KEY ("tourist_id") REFERENCES "tourist"("tourist_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tourist" ADD CONSTRAINT "tourist_tourist_id_fkey" FOREIGN KEY ("tourist_id") REFERENCES "users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
