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

export function toDomainParticipant(participant: {
  id: string;
  spaceId: string;
  email: string;
  role: SpaceParticipant["role"];
  consentAt: Date;
  noticeVersion: string;
  createdAt: Date;
}): SpaceParticipant {
  return {
    id: participant.id,
    spaceId: participant.spaceId,
    email: participant.email,
    role: participant.role,
    consentAt: participant.consentAt.toISOString(),
    noticeVersion: participant.noticeVersion,
    createdAt: participant.createdAt.toISOString(),
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

  async create(input) {
    const participant = await prisma.spaceParticipant.create({
      data: {
        spaceId: input.spaceId,
        email: input.email,
        role: input.role,
        consentAt: input.consentAt,
        noticeVersion: input.noticeVersion,
      },
    });
    return toDomainParticipant(participant);
  },

  async deleteCascade(id) {
    // One transaction: a crash partway through must not leave a live session or
    // an orphaned pin for a participant whose row is gone (TASK.md section 2).
    await prisma.$transaction([
      prisma.spaceLocation.deleteMany({ where: { participantId: id } }),
      prisma.spaceMagicLinkToken.deleteMany({ where: { participantId: id } }),
      // Only *their own unaccepted* invites - "their unaccepted invites" in the
      // spec means invites this participant sent that nobody has accepted yet,
      // not invites sent *to* them (those aren't tied to a participant row at
      // all until accepted).
      prisma.spaceInvite.deleteMany({ where: { inviterParticipantId: id, usedAt: null } }),
      prisma.spaceParticipant.delete({ where: { id } }),
    ]);
  },
};
