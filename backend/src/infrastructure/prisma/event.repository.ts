import type { FieldDef, OptInEvent } from "../../domain/space/space.types.js";
import type { EventRepository } from "../../application/space/event.repository.js";
import { prisma } from "./prisma-client.js";

function toDomainEvent(event: {
  id: string;
  spaceId: string;
  slug: string;
  title: string;
  kind: string;
  fieldSchema: unknown;
  opensAt: Date | null;
  closesAt: Date | null;
}): OptInEvent {
  return {
    id: event.id,
    spaceId: event.spaceId,
    slug: event.slug,
    title: event.title,
    kind: event.kind,
    fieldSchema: event.fieldSchema as FieldDef[],
    opensAt: event.opensAt?.toISOString() ?? null,
    closesAt: event.closesAt?.toISOString() ?? null,
  };
}

export const prismaEventRepository: EventRepository = {
  async findBySlug(spaceId, slug) {
    const event = await prisma.optInEvent.findUnique({ where: { spaceId_slug: { spaceId, slug } } });
    return event ? toDomainEvent(event) : null;
  },

  async findById(id) {
    const event = await prisma.optInEvent.findUnique({ where: { id } });
    return event ? toDomainEvent(event) : null;
  },

  async findAllBySpace(spaceId) {
    const events = await prisma.optInEvent.findMany({ where: { spaceId }, orderBy: { createdAt: "desc" } });
    return events.map(toDomainEvent);
  },

  async create(input) {
    const event = await prisma.optInEvent.create({
      data: {
        spaceId: input.spaceId,
        slug: input.slug,
        title: input.title,
        kind: input.kind,
        fieldSchema: input.fieldSchema,
        opensAt: input.opensAt,
        closesAt: input.closesAt,
      },
    });
    return toDomainEvent(event);
  },
};
