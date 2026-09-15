import type { Prisma } from "@prisma/client";
import type { OptInEntry } from "../../domain/space/space.types.js";
import type { EntryRepository } from "../../application/space/entry.repository.js";
import { prisma } from "./prisma-client.js";

function toDomainEntry(entry: {
  id: string;
  eventId: string;
  participantId: string;
  addressLabel: string | null;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}): OptInEntry {
  return {
    id: entry.id,
    eventId: entry.eventId,
    participantId: entry.participantId,
    addressLabel: entry.addressLabel,
    data: entry.data as Record<string, unknown>,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export const prismaEntryRepository: EntryRepository = {
  async findById(id) {
    const entry = await prisma.optInEntry.findUnique({ where: { id } });
    return entry ? toDomainEntry(entry) : null;
  },

  async findAllByEvent(eventId) {
    const entries = await prisma.optInEntry.findMany({ where: { eventId } });
    return entries.map(toDomainEntry);
  },

  async create(input) {
    const entry = await prisma.optInEntry.create({
      data: {
        eventId: input.eventId,
        participantId: input.participantId,
        addressLabel: input.addressLabel,
        data: input.data as Prisma.InputJsonValue,
      },
    });
    return toDomainEntry(entry);
  },

  async update(id, input) {
    const existing = await prisma.optInEntry.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    const entry = await prisma.optInEntry.update({
      where: { id },
      data: { addressLabel: input.addressLabel, data: input.data as Prisma.InputJsonValue },
    });
    return toDomainEntry(entry);
  },

  async delete(id) {
    const existing = await prisma.optInEntry.findUnique({ where: { id } });
    if (!existing) {
      return false;
    }
    await prisma.optInEntry.delete({ where: { id } });
    return true;
  },
};
