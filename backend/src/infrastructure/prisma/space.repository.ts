import type { Space, SpaceParticipant } from "../../domain/space/space.types.js";
import type { SpaceParticipantRepository, SpaceRepository } from "../../application/space/space.repository.js";
import { prisma } from "./prisma-client.js";

function toDomainSpace(space: { id: string; slug: string; name: string; createdAt: Date }): Space {
  return { id: space.id, slug: space.slug, name: space.name, createdAt: space.createdAt.toISOString() };
}

export const prismaSpaceRepository: SpaceRepository = {
  async findBySlug(slug) {
    const space = await prisma.space.findUnique({ where: { slug } });
    return space ? toDomainSpace(space) : null;
  },

  async create(input) {
    const space = await prisma.space.create({ data: { slug: input.slug, name: input.name } });
    return toDomainSpace(space);
  },
};

function toDomainParticipant(participant: {
  id: string;
  spaceId: string;
  email: string;
  displayName: string | null;
}): SpaceParticipant {
  return {
    id: participant.id,
    spaceId: participant.spaceId,
    email: participant.email,
    displayName: participant.displayName,
  };
}

export const prismaSpaceParticipantRepository: SpaceParticipantRepository = {
  async findById(id) {
    const participant = await prisma.spaceParticipant.findUnique({ where: { id } });
    return participant ? toDomainParticipant(participant) : null;
  },

  async findByEmail(spaceId, email) {
    const participant = await prisma.spaceParticipant.findUnique({ where: { spaceId_email: { spaceId, email } } });
    return participant ? toDomainParticipant(participant) : null;
  },

  async findOrCreate(spaceId, email) {
    const participant = await prisma.spaceParticipant.upsert({
      where: { spaceId_email: { spaceId, email } },
      update: {},
      create: { spaceId, email },
    });
    return toDomainParticipant(participant);
  },
};
