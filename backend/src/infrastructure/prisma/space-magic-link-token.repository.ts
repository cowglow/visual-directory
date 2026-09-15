import type { SpaceMagicLinkTokenRepository } from "../../application/space/space.repository.js";
import { prisma } from "./prisma-client.js";

export const prismaSpaceMagicLinkTokenRepository: SpaceMagicLinkTokenRepository = {
  async create(participantId, tokenHash, expiresAt) {
    await prisma.spaceMagicLinkToken.create({ data: { participantId, tokenHash, expiresAt } });
  },

  async findByHash(tokenHash) {
    const record = await prisma.spaceMagicLinkToken.findUnique({
      where: { tokenHash },
      include: { participant: true },
    });
    if (!record) {
      return null;
    }
    return {
      record: { id: record.id, expiresAt: record.expiresAt, usedAt: record.usedAt },
      participant: {
        id: record.participant.id,
        spaceId: record.participant.spaceId,
        email: record.participant.email,
        displayName: record.participant.displayName,
      },
    };
  },

  async markUsed(id) {
    await prisma.spaceMagicLinkToken.update({ where: { id }, data: { usedAt: new Date() } });
  },
};
