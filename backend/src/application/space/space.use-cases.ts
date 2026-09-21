import { hashToken, isTokenUsable, TOKEN_TTL_MS } from "../../domain/auth/magic-link.js";
import type { Space, SpaceInvite, SpaceLocation, SpaceParticipant, SpaceRole } from "../../domain/space/space.types.js";
import type { Mailer } from "../mailer.js";
import type { TokenGenerator } from "../token-generator.js";
import type { SpaceTokenSigner } from "../space-token-signer.js";
import type {
  SpaceInviteRepository,
  SpaceLocationRepository,
  SpaceMagicLinkTokenRepository,
  SpaceParticipantRepository,
  SpaceRepository,
} from "./space.repository.js";
import {
  AlreadyParticipantError,
  ConsentRequiredError,
  DuplicateSpaceSlugError,
  InviteAlreadyUsedError,
  InviteCapExceededError,
  InviteExpiredError,
  InviteNotFoundError,
  InviteOwnershipError,
  InviteRateLimitError,
  InviteRevokedError,
  LocationAlreadyExistsError,
  LocationNotFoundError,
  LocationOwnershipError,
  RoleEscalationError,
  SpaceMailDeliveryError,
} from "./space.errors.js";

// Bumped whenever the privacy notice's substance changes - each participant's
// SpaceParticipant.noticeVersion records which version they consented to
// (TASK.md section 3). Not env-configurable: it's a fact about the copy in this
// codebase, not a deployment setting.
export const CURRENT_NOTICE_VERSION = "2026-09-21";

export interface CreateSpaceDeps {
  spaceRepository: SpaceRepository;
}

export function createCreateSpaceUseCase(deps: CreateSpaceDeps) {
  return async function createSpace(input: { slug: string; name: string }): Promise<Space> {
    const existing = await deps.spaceRepository.findBySlug(input.slug);
    if (existing) {
      throw new DuplicateSpaceSlugError("A space with that link already exists - pick another name");
    }
    return deps.spaceRepository.create(input);
  };
}

export interface RequestSpaceMagicLinkDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceMagicLinkTokenRepository: SpaceMagicLinkTokenRepository;
  mailer: Mailer;
  tokenGenerator: TokenGenerator;
  clientOrigin: string;
  clientAppPath: string;
  isDevMode: boolean;
}

// Sign-in only - there is no self-serve sign-up any more (TASK.md section 2:
// "NO public access... Arrives by invite"). An email with no participant record
// in this space gets the exact same response as one that does, so this endpoint
// can't be used to enumerate who has already joined.
export function createRequestSpaceMagicLinkUseCase(deps: RequestSpaceMagicLinkDeps) {
  return async function requestSpaceMagicLink(
    space: Space,
    email: string,
  ): Promise<{ message: string; devToken?: string }> {
    const message = "If that email is signed up for this map, a sign-in link has been sent.";

    const participant = await deps.spaceParticipantRepository.findByEmail(space.id, email);
    if (!participant) {
      return { message };
    }

    const token = deps.tokenGenerator.generate();
    await deps.spaceMagicLinkTokenRepository.create(participant.id, hashToken(token), new Date(Date.now() + TOKEN_TTL_MS));
    // Spaces is served at its own real path, /spaces/, not a route inside the
    // directory app's own bundle - see frontend/spaces-main.tsx and
    // vite.config.ts's second build entry.
    const url = `${deps.clientOrigin}${deps.clientAppPath}/spaces/#/${space.slug}?token=${token}`;

    try {
      await deps.mailer.sendMagicLink(email, url);
    } catch (err) {
      console.error(`[mailer] failed to send space sign-in email to ${email}:`, err);
      throw new SpaceMailDeliveryError("Couldn't send the sign-in email. Please try again.");
    }

    return { message, ...(deps.isDevMode ? { devToken: token } : {}) };
  };
}

export interface VerifySpaceMagicLinkDeps {
  spaceMagicLinkTokenRepository: SpaceMagicLinkTokenRepository;
  spaceTokenSigner: SpaceTokenSigner;
}

export function createVerifySpaceMagicLinkUseCase(deps: VerifySpaceMagicLinkDeps) {
  return async function verifySpaceMagicLink(
    token: string,
  ): Promise<{ token: string; participant: SpaceParticipant } | null> {
    const found = await deps.spaceMagicLinkTokenRepository.findByHash(hashToken(token));
    if (!found || !isTokenUsable(found.record, new Date())) {
      return null;
    }

    await deps.spaceMagicLinkTokenRepository.markUsed(found.record.id);
    const session = deps.spaceTokenSigner.sign({
      scope: "space",
      participantId: found.participant.id,
      spaceId: found.participant.spaceId,
      email: found.participant.email,
      role: found.participant.role,
    });
    return { token: session, participant: found.participant };
  };
}

export interface InviteParticipantDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceInviteRepository: SpaceInviteRepository;
  mailer: Mailer;
  tokenGenerator: TokenGenerator;
  clientOrigin: string;
  clientAppPath: string;
  isDevMode: boolean;
  // TASK.md section 2: "expire (configurable, default 7 days)... rate-limited
  // per inviter, capped total per participant (configurable)".
  inviteTokenTtlMs: number;
  inviteRateLimitWindowMs: number;
  inviteRateLimitMax: number;
  inviteMaxPerParticipant: number;
}

export function createInviteParticipantUseCase(deps: InviteParticipantDeps) {
  return async function inviteParticipant(
    space: Space,
    inviter: SpaceParticipant,
    input: { email: string; role: SpaceRole },
  ): Promise<{ message: string; devToken?: string }> {
    // Defense in depth beyond requireSpaceRole("participant") at the route level
    // (this repo's convention: the frontend/route gate is UX, not the boundary).
    // A visitor can never invite, so there is no role above "participant" one
    // could escalate to - both invitable roles are at or below the inviter's own.
    if (inviter.role !== "participant") {
      throw new RoleEscalationError("Only a participant can send invites");
    }

    const rateLimitSince = new Date(Date.now() - deps.inviteRateLimitWindowMs);
    const recentCount = await deps.spaceInviteRepository.countByInviter(inviter.id, rateLimitSince);
    if (recentCount >= deps.inviteRateLimitMax) {
      throw new InviteRateLimitError("You're sending invites too fast - please wait a bit and try again");
    }

    const lifetimeCount = await deps.spaceInviteRepository.countByInviter(inviter.id);
    if (lifetimeCount >= deps.inviteMaxPerParticipant) {
      throw new InviteCapExceededError("You've reached the limit of invites you can send for this map");
    }

    const message = "If that invite can be sent, it has been.";

    // An email already signed up for this space gets the same generic response
    // rather than a distinct "already a participant" error - same
    // anti-enumeration reasoning as requestSpaceMagicLink, just from the
    // inviter's side instead of the invitee's.
    const existingParticipant = await deps.spaceParticipantRepository.findByEmail(space.id, input.email);
    if (existingParticipant) {
      return { message };
    }

    const token = deps.tokenGenerator.generate();
    await deps.spaceInviteRepository.create({
      spaceId: space.id,
      email: input.email,
      role: input.role,
      tokenHash: hashToken(token),
      inviterParticipantId: inviter.id,
      expiresAt: new Date(Date.now() + deps.inviteTokenTtlMs),
    });
    const url = `${deps.clientOrigin}${deps.clientAppPath}/spaces/#/${space.slug}/invite?token=${token}`;

    try {
      await deps.mailer.sendMagicLink(input.email, url);
    } catch (err) {
      console.error(`[mailer] failed to send space invite email to ${input.email}:`, err);
      throw new SpaceMailDeliveryError("Couldn't send the invite email. Please try again.");
    }

    return { message, ...(deps.isDevMode ? { devToken: token } : {}) };
  };
}

export interface RevokeInviteDeps {
  spaceInviteRepository: SpaceInviteRepository;
}

export function createRevokeInviteUseCase(deps: RevokeInviteDeps) {
  return async function revokeInvite(inviteId: string, requesterParticipantId: string): Promise<void> {
    const invite = await deps.spaceInviteRepository.findById(inviteId);
    if (!invite) {
      throw new InviteNotFoundError("Invite not found");
    }
    if (invite.inviterParticipantId !== requesterParticipantId) {
      throw new InviteOwnershipError("You can only revoke invites you sent");
    }
    if (invite.usedAt) {
      throw new InviteAlreadyUsedError("This invite was already accepted and can't be revoked");
    }
    await deps.spaceInviteRepository.revoke(inviteId);
  };
}

export interface AcceptInviteDeps {
  spaceInviteRepository: SpaceInviteRepository;
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceTokenSigner: SpaceTokenSigner;
}

export function createAcceptInviteUseCase(deps: AcceptInviteDeps) {
  return async function acceptInvite(
    space: Space,
    token: string,
    consent: boolean,
  ): Promise<{ token: string; participant: SpaceParticipant }> {
    const invite = await deps.spaceInviteRepository.findByTokenHash(hashToken(token));
    // Not-found, wrong-space, revoked, used, and expired are deliberately not
    // distinguished in what's thrown up to the route layer's response - all of
    // them collapse to "Invalid or expired invite" there, so a token guess can't
    // be used to probe invite state.
    if (!invite || invite.spaceId !== space.id) {
      throw new InviteNotFoundError("Invite not found");
    }
    if (invite.revokedAt) {
      throw new InviteRevokedError("Invite revoked");
    }
    if (invite.usedAt) {
      throw new InviteAlreadyUsedError("Invite already used");
    }
    if (invite.expiresAt < new Date().toISOString()) {
      throw new InviteExpiredError("Invite expired");
    }
    if (!consent) {
      throw new ConsentRequiredError("Consent is required to join this map");
    }

    const existingParticipant = await deps.spaceParticipantRepository.findByEmail(space.id, invite.email);
    if (existingParticipant) {
      throw new AlreadyParticipantError("This email is already signed up - sign in instead");
    }

    const participant = await deps.spaceParticipantRepository.create({
      spaceId: space.id,
      email: invite.email,
      role: invite.role,
      consentAt: new Date(),
      noticeVersion: CURRENT_NOTICE_VERSION,
    });
    await deps.spaceInviteRepository.markUsed(invite.id);

    const session = deps.spaceTokenSigner.sign({
      scope: "space",
      participantId: participant.id,
      spaceId: participant.spaceId,
      email: participant.email,
      role: participant.role,
    });
    return { token: session, participant };
  };
}

export interface LocationDeps {
  spaceLocationRepository: SpaceLocationRepository;
}

export function createAddLocationUseCase(deps: LocationDeps) {
  return async function addLocation(
    participant: SpaceParticipant,
    input: { label: string; note: string; lat: number; lng: number },
  ): Promise<SpaceLocation> {
    if (participant.role !== "participant") {
      throw new LocationOwnershipError("Only a participant can place a pin");
    }
    const existing = await deps.spaceLocationRepository.findByParticipant(participant.id);
    if (existing) {
      throw new LocationAlreadyExistsError("You already have a pin - edit it instead of adding another");
    }
    return deps.spaceLocationRepository.create({ spaceId: participant.spaceId, participantId: participant.id, ...input });
  };
}

export function createUpdateLocationUseCase(deps: LocationDeps) {
  return async function updateLocation(
    participant: SpaceParticipant,
    locationId: string,
    input: { label: string; note: string; lat: number; lng: number },
  ): Promise<SpaceLocation> {
    const existing = await deps.spaceLocationRepository.findById(locationId);
    if (!existing) {
      throw new LocationNotFoundError("Pin not found");
    }
    if (existing.participantId !== participant.id) {
      throw new LocationOwnershipError("You can only edit your own pin");
    }
    const updated = await deps.spaceLocationRepository.update(locationId, input);
    if (!updated) {
      throw new LocationNotFoundError("Pin not found");
    }
    return updated;
  };
}

export function createDeleteLocationUseCase(deps: LocationDeps) {
  return async function deleteLocation(participant: SpaceParticipant, locationId: string): Promise<void> {
    const existing = await deps.spaceLocationRepository.findById(locationId);
    if (!existing) {
      throw new LocationNotFoundError("Pin not found");
    }
    if (existing.participantId !== participant.id) {
      throw new LocationOwnershipError("You can only remove your own pin");
    }
    await deps.spaceLocationRepository.delete(locationId);
  };
}

export interface RemoveMeDeps {
  spaceParticipantRepository: SpaceParticipantRepository;
}

// TASK.md section 2: "Only a participant can remove themselves... 'Remove me'
// deletes their pin, participant record, sessions, and their unaccepted
// invites." Open to both roles (a visitor has no pin but still has consent to
// withdraw) - deliberately not role-gated, since gating it would leave visitors
// with no way to withdraw consent or leave the map.
export function createRemoveMeUseCase(deps: RemoveMeDeps) {
  return async function removeMe(participant: SpaceParticipant): Promise<void> {
    await deps.spaceParticipantRepository.deleteCascade(participant.id);
  };
}

export type { SpaceInvite };
