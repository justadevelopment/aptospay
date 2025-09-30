-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "aptos_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "sender_address" TEXT,
    "recipient_address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transaction_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_mappings" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "aptos_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_aptos_address_key" ON "users"("aptos_address");

-- CreateIndex
CREATE INDEX "payments_recipient_email_idx" ON "payments"("recipient_email");

-- CreateIndex
CREATE INDEX "payments_sender_address_idx" ON "payments"("sender_address");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "email_mappings_email_key" ON "email_mappings"("email");

-- CreateIndex
CREATE INDEX "email_mappings_email_idx" ON "email_mappings"("email");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sender_address_fkey" FOREIGN KEY ("sender_address") REFERENCES "users"("aptos_address") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recipient_address_fkey" FOREIGN KEY ("recipient_address") REFERENCES "users"("aptos_address") ON DELETE SET NULL ON UPDATE CASCADE;
