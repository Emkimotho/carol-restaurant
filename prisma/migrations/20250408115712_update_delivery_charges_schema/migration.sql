-- CreateTable
CREATE TABLE "DeliveryCharges" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "ratePerMile" DOUBLE PRECISION NOT NULL,
    "ratePerHour" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryCharges_pkey" PRIMARY KEY ("id")
);
