import type { Space, SpaceParticipant } from "../../domain/space/space.types.js";
import type { MagicLinkTokenRecord } from "../../domain/auth/magic-link.js";

export interface SpaceRepository {
  findBySlug(slug: string): Promise<Space | null>;
  create(input: { slug: string; name: string }): Promise<Space>;
}

export interface SpaceParticipantRepository {
  findById(id: string): Promise<SpaceParticipant | null>;
  findByEmail(spaceId: string, email: string): Promise<SpaceParticipant | null>;
  // Self-service by design: a Space has no invite step, so requesting a magic
  // link for an email not yet seen in this Space creates the participant.
  findOrCreate(spaceId: string, email: string): Promise<SpaceParticipant>;
}

// Same shape as application/magic-link/magic-link-token.repository.ts, just
// keyed to a SpaceParticipant instead of the directory's Account - reuses the
// same domain/auth/magic-link.ts rules (hashToken, isTokenUsable, TOKEN_TTL_MS),
// only the storage/ownership differs.
export interface SpaceMagicLinkTokenRepository {
  create(participantId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByHash(
    tokenHash: string,
  ): Promise<{ record: MagicLinkTokenRecord; participant: SpaceParticipant } | null>;
  markUsed(id: string): Promise<void>;
}
