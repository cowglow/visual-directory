-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceParticipant" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceMagicLinkToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceMagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptInEvent" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fieldSchema" JSONB NOT NULL,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptInEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptInEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "addressLabel" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptInEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Space_slug_key" ON "Space"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceParticipant_spaceId_email_key" ON "SpaceParticipant"("spaceId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceMagicLinkToken_tokenHash_key" ON "SpaceMagicLinkToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "OptInEvent_spaceId_slug_key" ON "OptInEvent"("spaceId", "slug");

-- CreateIndex
CREATE INDEX "OptInEntry_eventId_idx" ON "OptInEntry"("eventId");

-- AddForeignKey
ALTER TABLE "SpaceParticipant" ADD CONSTRAINT "SpaceParticipant_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceMagicLinkToken" ADD CONSTRAINT "SpaceMagicLinkToken_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SpaceParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptInEvent" ADD CONSTRAINT "OptInEvent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptInEntry" ADD CONSTRAINT "OptInEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "OptInEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptInEntry" ADD CONSTRAINT "OptInEntry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SpaceParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
