import type { OptInEntry } from "../../domain/space/space.types.js";

export interface EntryRepository {
  findById(id: string): Promise<OptInEntry | null>;
  findAllByEvent(eventId: string): Promise<OptInEntry[]>;
  create(input: {
    eventId: string;
    participantId: string;
    addressLabel: string | null;
    data: Record<string, unknown>;
  }): Promise<OptInEntry>;
  update(id: string, input: { addressLabel: string | null; data: Record<string, unknown> }): Promise<OptInEntry | null>;
  delete(id: string): Promise<boolean>;
}
