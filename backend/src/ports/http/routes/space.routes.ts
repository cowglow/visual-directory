import { Router, type Request, type RequestHandler, type Response } from "express";
import type { Mailer } from "../../../application/mailer.js";
import type { TokenGenerator } from "../../../application/token-generator.js";
import type { SpaceTokenSigner } from "../../../application/space-token-signer.js";
import type {
  SpaceMagicLinkTokenRepository,
  SpaceParticipantRepository,
  SpaceRepository,
} from "../../../application/space/space.repository.js";
import type { EventRepository } from "../../../application/space/event.repository.js";
import type { EntryRepository } from "../../../application/space/entry.repository.js";
import {
  createCreateEventUseCase,
  createCreateSpaceUseCase,
  createDeleteEntryUseCase,
  createRequestSpaceMagicLinkUseCase,
  createSubmitEntryUseCase,
  createUpdateEntryUseCase,
  createVerifySpaceMagicLinkUseCase,
} from "../../../application/space/space.use-cases.js";
import {
  DuplicateEventSlugError,
  DuplicateSpaceSlugError,
  EntryNotFoundError,
  EntryOwnershipError,
  SpaceMailDeliveryError,
} from "../../../application/space/space.errors.js";
import { sortEntriesByAddress } from "../../../domain/space/sort-entries.js";
import type { AddressValue, OptInEvent } from "../../../domain/space/space.types.js";
import { magicLinkRequestSchema, verifyMagicLinkSchema } from "../validation/auth.schemas.js";
import { buildEntryDataSchema, eventCreateSchema, spaceCreateSchema } from "../validation/space.schemas.js";
import { validateBody } from "../middleware/validate-body.js";
import { spaceMagicLinkRateLimiter } from "../middleware/rate-limit.js";
import { asyncHandler } from "../lib/async-handler.js";
import type { z } from "zod";

export interface SpaceRouterDeps {
  requireSpaceAuth: RequestHandler;
  spaceRepository: SpaceRepository;
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceMagicLinkTokenRepository: SpaceMagicLinkTokenRepository;
  eventRepository: EventRepository;
  entryRepository: EntryRepository;
  spaceTokenSigner: SpaceTokenSigner;
  mailer: Mailer;
  tokenGenerator: TokenGenerator;
  clientOrigin: string;
  clientAppPath: string;
  isDevMode: boolean;
}

// The first "address"-type field (there's normally exactly one) supplies the
// denormalized addressLabel used for sorting/display/print - see
// domain/space/sort-entries.ts and OptInEntry.addressLabel in the schema.
function extractAddressLabel(event: OptInEvent, data: Record<string, unknown>): string | null {
  const addressField = event.fieldSchema.find((field) => field.type === "address");
  if (!addressField) return null;
  const value = data[addressField.key] as AddressValue | undefined;
  return value?.text.trim() || null;
}

export function createSpaceRouter(deps: SpaceRouterDeps): Router {
  const router = Router();
  const createSpace = createCreateSpaceUseCase(deps);
  const requestSpaceMagicLink = createRequestSpaceMagicLinkUseCase(deps);
  const verifySpaceMagicLink = createVerifySpaceMagicLinkUseCase(deps);
  const createEvent = createCreateEventUseCase(deps);
  const submitEntry = createSubmitEntryUseCase(deps);
  const updateEntry = createUpdateEntryUseCase(deps);
  const deleteEntry = createDeleteEntryUseCase(deps);

  // A request scoped to :slug must also carry a session for *that* space -
  // otherwise a valid session for Space A could read/write Space B just by
  // changing the URL, since the JWT itself only proves "some space,
  // some participant," not which one.
  async function loadOwnSpace(req: Request, res: Response) {
    const space = await deps.spaceRepository.findBySlug(req.params.slug);
    if (!space) {
      res.status(404).json({ error: "Space not found" });
      return null;
    }
    if (req.spaceSession?.spaceId !== space.id) {
      res.status(403).json({ error: "Not signed in to this space" });
      return null;
    }
    return space;
  }

  router.post(
    "/",
    validateBody(spaceCreateSchema),
    asyncHandler(async (req, res) => {
      const { slug, name } = req.body as z.infer<typeof spaceCreateSchema>;
      try {
        const space = await createSpace({ slug, name });
        res.status(201).json({ space });
      } catch (err) {
        if (err instanceof DuplicateSpaceSlugError) {
          res.status(409).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    "/:slug",
    asyncHandler(async (req, res) => {
      const space = await deps.spaceRepository.findBySlug(req.params.slug);
      if (!space) {
        res.status(404).json({ error: "Space not found" });
        return;
      }
      res.json({ space });
    }),
  );

  router.post(
    "/:slug/magic-link",
    spaceMagicLinkRateLimiter,
    validateBody(magicLinkRequestSchema),
    asyncHandler(async (req, res) => {
      const space = await deps.spaceRepository.findBySlug(req.params.slug);
      if (!space) {
        res.status(404).json({ error: "Space not found" });
        return;
      }
      const { email } = req.body as z.infer<typeof magicLinkRequestSchema>;
      try {
        res.json(await requestSpaceMagicLink(space, email));
      } catch (err) {
        if (err instanceof SpaceMailDeliveryError) {
          res.status(502).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.post(
    "/:slug/verify",
    validateBody(verifyMagicLinkSchema),
    asyncHandler(async (req, res) => {
      const { token } = req.body as z.infer<typeof verifyMagicLinkSchema>;
      const result = await verifySpaceMagicLink(token);
      if (!result || result.participant.spaceId !== (await deps.spaceRepository.findBySlug(req.params.slug))?.id) {
        res.status(400).json({ error: "Invalid or expired token" });
        return;
      }
      res.json(result);
    }),
  );

  router.get(
    "/:slug/me",
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      res.json({ participant: req.spaceSession });
    }),
  );

  router.get(
    "/:slug/events",
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const events = await deps.eventRepository.findAllBySpace(space.id);
      res.json({ events });
    }),
  );

  router.post(
    "/:slug/events",
    deps.requireSpaceAuth,
    validateBody(eventCreateSchema),
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const input = req.body as z.infer<typeof eventCreateSchema>;
      try {
        const event = await createEvent(space, {
          ...input,
          opensAt: input.opensAt ? new Date(input.opensAt) : null,
          closesAt: input.closesAt ? new Date(input.closesAt) : null,
        });
        res.status(201).json({ event });
      } catch (err) {
        if (err instanceof DuplicateEventSlugError) {
          res.status(409).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    "/:slug/events/:eventSlug",
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const event = await deps.eventRepository.findBySlug(space.id, req.params.eventSlug);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      res.json({ event });
    }),
  );

  router.get(
    "/:slug/events/:eventSlug/entries",
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const event = await deps.eventRepository.findBySlug(space.id, req.params.eventSlug);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }
      const entries = await deps.entryRepository.findAllByEvent(event.id);
      res.json({ entries: sortEntriesByAddress(entries) });
    }),
  );

  router.post(
    "/:slug/events/:eventSlug/entries",
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const event = await deps.eventRepository.findBySlug(space.id, req.params.eventSlug);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      // The valid shape of `data` depends on this event's own fieldSchema, read
      // from the database above - it can't be a static validateBody schema the
      // way every other route's body is (see space.schemas.ts's comment).
      const result = buildEntryDataSchema(event.fieldSchema).safeParse((req.body as { data?: unknown })?.data);
      if (!result.success) {
        res.status(400).json({
          error: "Invalid entry",
          issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        });
        return;
      }

      const addressLabel = extractAddressLabel(event, result.data);

      const entry = await submitEntry(event, req.spaceSession!.participantId, { addressLabel, data: result.data });
      res.status(201).json({ entry });
    }),
  );

  router.patch(
    "/:slug/entries/:entryId",
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const existing = await deps.entryRepository.findById(req.params.entryId);
      if (!existing) {
        res.status(404).json({ error: "Entry not found" });
        return;
      }
      const event = await deps.eventRepository.findById(existing.eventId);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      const result = buildEntryDataSchema(event.fieldSchema).safeParse((req.body as { data?: unknown })?.data);
      if (!result.success) {
        res.status(400).json({
          error: "Invalid entry",
          issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        });
        return;
      }

      const addressLabel = extractAddressLabel(event, result.data);

      try {
        const entry = await updateEntry(req.params.entryId, req.spaceSession!.participantId, {
          addressLabel,
          data: result.data,
        });
        res.json({ entry });
      } catch (err) {
        if (err instanceof EntryOwnershipError) {
          res.status(403).json({ error: err.message });
          return;
        }
        if (err instanceof EntryNotFoundError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.delete(
    "/:slug/entries/:entryId",
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      try {
        await deleteEntry(req.params.entryId, req.spaceSession!.participantId);
        res.status(204).send();
      } catch (err) {
        if (err instanceof EntryOwnershipError) {
          res.status(403).json({ error: err.message });
          return;
        }
        if (err instanceof EntryNotFoundError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
