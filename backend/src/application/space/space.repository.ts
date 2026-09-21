import type { Space, SpaceInvite, SpaceLocation, SpaceParticipant, SpaceRole } from "../../domain/space/space.types.js";
import type { MagicLinkTokenRecord } from "../../domain/auth/magic-link.js";

export interface SpaceRepository {
  findBySlug(slug: string): Promise<Space | null>;
  // Only used by the seed script now - there's no public self-serve "create a
  // space" endpoint any more (TASK.md section 2: "NO public access").
  create(input: { slug: string; name: string }): Promise<Space>;
}

export interface SpaceParticipantRepository {
  findById(id: string): Promise<SpaceParticipant | null>;
  findByEmail(spaceId: string, email: string): Promise<SpaceParticipant | null>;
  create(input: {
    spaceId: string;
    email: string;
    role: SpaceRole;
    consentAt: Date;
    noticeVersion: string;
  }): Promise<SpaceParticipant>;
  // "Remove me" (TASK.md section 2): deletes the participant row itself plus
  // everything that depends on it - their pin, their sign-in sessions, and any
  // invites *they* sent that nobody has accepted yet. One transaction so a crash
  // mid-delete can't leave an orphaned pin or a live session for a deleted account.
  deleteCascade(id: string): Promise<void>;
}

export interface SpaceLocationRepository {
  findById(id: string): Promise<SpaceLocation | null>;
  findByParticipant(participantId: string): Promise<SpaceLocation | null>;
  findAllBySpace(spaceId: string): Promise<SpaceLocation[]>;
  create(input: {
    spaceId: string;
    participantId: string;
    label: string;
    note: string;
    lat: number;
    lng: number;
  }): Promise<SpaceLocation>;
  update(id: string, input: { label: string; note: string; lat: number; lng: number }): Promise<SpaceLocation | null>;
  delete(id: string): Promise<boolean>;
}

// Same shape as application/magic-link/magic-link-token.repository.ts, just
// keyed to a SpaceParticipant instead of the directory's Account - reuses the
// same domain/auth/magic-link.ts rules (hashToken, isTokenUsable, TOKEN_TTL_MS),
// only the storage/ownership differs. Sign-in only now, not sign-up - see
// space.use-cases.ts's requestSpaceMagicLink.
export interface SpaceMagicLinkTokenRepository {
  create(participantId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByHash(tokenHash: string): Promise<{ record: MagicLinkTokenRecord; participant: SpaceParticipant } | null>;
  markUsed(id: string): Promise<void>;
}

export interface SpaceInviteRepository {
  findById(id: string): Promise<SpaceInvite | null>;
  findByTokenHash(tokenHash: string): Promise<SpaceInvite | null>;
  create(input: {
    spaceId: string;
    email: string;
    role: SpaceRole;
    tokenHash: string;
    inviterParticipantId: string;
    expiresAt: Date;
  }): Promise<SpaceInvite>;
  markUsed(id: string): Promise<void>;
  revoke(id: string): Promise<void>;
  // Rate limiting/capping (TASK.md section 2: "rate-limited per inviter, capped
  // total per participant") - both counts are scoped to invites *sent by* the
  // given participant, `since` bounding the rate-limit window and left undefined
  // for the lifetime cap.
  countByInviter(inviterParticipantId: string, since?: Date): Promise<number>;
}
