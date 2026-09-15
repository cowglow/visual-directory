import type { FieldDef, OptInEvent } from "../../domain/space/space.types.js";

export interface EventRepository {
  findBySlug(spaceId: string, slug: string): Promise<OptInEvent | null>;
  findById(id: string): Promise<OptInEvent | null>;
  findAllBySpace(spaceId: string): Promise<OptInEvent[]>;
  create(input: {
    spaceId: string;
    slug: string;
    title: string;
    kind: string;
    fieldSchema: FieldDef[];
    opensAt: Date | null;
    closesAt: Date | null;
  }): Promise<OptInEvent>;
}
