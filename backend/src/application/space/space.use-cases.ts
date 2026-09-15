import { hashToken, isTokenUsable, TOKEN_TTL_MS } from "../../domain/auth/magic-link.js";
import type { FieldDef, OptInEntry, OptInEvent, Space, SpaceParticipant } from "../../domain/space/space.types.js";
import type { Mailer } from "../mailer.js";
import type { TokenGenerator } from "../token-generator.js";
import type { SpaceTokenSigner } from "../space-token-signer.js";
import type { EntryRepository } from "./entry.repository.js";
import type { EventRepository } from "./event.repository.js";
import type {
  SpaceMagicLinkTokenRepository,
  SpaceParticipantRepository,
  SpaceRepository,
} from "./space.repository.js";
import {
  DuplicateEventSlugError,
  DuplicateSpaceSlugError,
  EntryNotFoundError,
  EntryOwnershipError,
  SpaceMailDeliveryError,
} from "./space.errors.js";

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
  // Same reasoning as RequestMagicLinkDeps.isDevMode in auth.use-cases.ts.
  isDevMode: boolean;
}

export function createRequestSpaceMagicLinkUseCase(deps: RequestSpaceMagicLinkDeps) {
  return async function requestSpaceMagicLink(
    space: Space,
    email: string,
  ): Promise<{ message: string; devToken?: string }> {
    // No invite step for a Space - the first request for an email creates the
    // participant. Unlike the directory's requestMagicLink, there's no
    // "account might not exist" case to hide behind a constant response.
    const participant = await deps.spaceParticipantRepository.findOrCreate(space.id, email);

    const token = deps.tokenGenerator.generate();
    await deps.spaceMagicLinkTokenRepository.create(
      participant.id,
      hashToken(token),
      new Date(Date.now() + TOKEN_TTL_MS),
    );
    // Spaces is served at its own real path, /spaces/, not a route inside the
    // directory app's own bundle - see frontend/spaces-main.tsx and
    // vite.config.ts's second build entry.
    const url = `${deps.clientOrigin}${deps.clientAppPath}/spaces/#/${space.slug}?token=${token}`;

    try {
      await deps.mailer.sendMagicLink(email, url);
    } catch (err) {
      // Log the failure, not the link/token - same reasoning as
      // auth.use-cases.ts's requestMagicLink.
      console.error(`[mailer] failed to send space magic-link email to ${email}:`, err);
      throw new SpaceMailDeliveryError("Couldn't send the sign-in email. Please try again.");
    }

    const message = "Check your email for a sign-in link.";
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
    });
    return { token: session, participant: found.participant };
  };
}

export interface EventDeps {
  eventRepository: EventRepository;
}

export function createCreateEventUseCase(deps: EventDeps) {
  return async function createEvent(
    space: Space,
    input: { slug: string; title: string; kind: string; fieldSchema: FieldDef[]; opensAt: Date | null; closesAt: Date | null },
  ): Promise<OptInEvent> {
    const existing = await deps.eventRepository.findBySlug(space.id, input.slug);
    if (existing) {
      throw new DuplicateEventSlugError("An event with that link already exists in this space");
    }
    return deps.eventRepository.create({ ...input, spaceId: space.id });
  };
}

export interface EntryDeps {
  entryRepository: EntryRepository;
  eventRepository: EventRepository;
}

// `data` arrives here already validated against the event's own fieldSchema -
// see ports/http/routes/space.routes.ts, which builds that Zod schema
// dynamically per request (the schema depends on data fetched from the
// database, so it can't be a static validateBody middleware like the
// directory's routes use).
export function createSubmitEntryUseCase(deps: EntryDeps) {
  return async function submitEntry(
    event: OptInEvent,
    participantId: string,
    input: { addressLabel: string | null; data: Record<string, unknown> },
  ): Promise<OptInEntry> {
    return deps.entryRepository.create({ eventId: event.id, participantId, ...input });
  };
}

export function createUpdateEntryUseCase(deps: EntryDeps) {
  return async function updateEntry(
    entryId: string,
    participantId: string,
    input: { addressLabel: string | null; data: Record<string, unknown> },
  ): Promise<OptInEntry> {
    const existing = await deps.entryRepository.findById(entryId);
    if (!existing) {
      throw new EntryNotFoundError("Entry not found");
    }
    if (existing.participantId !== participantId) {
      throw new EntryOwnershipError("You can only edit your own entry");
    }
    const updated = await deps.entryRepository.update(entryId, input);
    if (!updated) {
      throw new EntryNotFoundError("Entry not found");
    }
    return updated;
  };
}

export function createDeleteEntryUseCase(deps: EntryDeps) {
  return async function deleteEntry(entryId: string, participantId: string): Promise<void> {
    const existing = await deps.entryRepository.findById(entryId);
    if (!existing) {
      throw new EntryNotFoundError("Entry not found");
    }
    if (existing.participantId !== participantId) {
      throw new EntryOwnershipError("You can only remove your own entry");
    }
    await deps.entryRepository.delete(entryId);
  };
}
