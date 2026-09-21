import { Router, type Request, type RequestHandler, type Response } from "express";
import type { Mailer } from "../../../application/mailer.js";
import type { TokenGenerator } from "../../../application/token-generator.js";
import type { SpaceTokenSigner } from "../../../application/space-token-signer.js";
import type {
  SpaceInviteRepository,
  SpaceLocationRepository,
  SpaceMagicLinkTokenRepository,
  SpaceParticipantRepository,
  SpaceRepository,
} from "../../../application/space/space.repository.js";
import {
  createAcceptInviteUseCase,
  createAddLocationUseCase,
  createDeleteLocationUseCase,
  createInviteParticipantUseCase,
  createRemoveMeUseCase,
  createRequestSpaceMagicLinkUseCase,
  createRevokeInviteUseCase,
  createUpdateLocationUseCase,
  createVerifySpaceMagicLinkUseCase,
} from "../../../application/space/space.use-cases.js";
import {
  AlreadyParticipantError,
  ConsentRequiredError,
  InviteAlreadyUsedError,
  InviteCapExceededError,
  InviteNotFoundError,
  InviteOwnershipError,
  InviteRateLimitError,
  InviteRevokedError,
  LocationAlreadyExistsError,
  LocationNotFoundError,
  LocationOwnershipError,
  RoleEscalationError,
  SpaceMailDeliveryError,
} from "../../../application/space/space.errors.js";
import { magicLinkRequestSchema, verifyMagicLinkSchema } from "../validation/auth.schemas.js";
import { acceptInviteSchema, inviteCreateSchema, locationWriteSchema } from "../validation/space.schemas.js";
import { validateBody } from "../middleware/validate-body.js";
import {
  spaceInviteAcceptRateLimiter,
  spaceInviteRateLimiter,
  spaceMagicLinkRateLimiter,
} from "../middleware/rate-limit.js";
import { requireSpaceRole } from "../middleware/require-space-role.js";
import { requireEventActive } from "../middleware/require-event-active.js";
import { asyncHandler } from "../lib/async-handler.js";
import type { z } from "zod";

export interface SpaceRouterDeps {
  requireSpaceAuth: RequestHandler;
  spaceRepository: SpaceRepository;
  spaceParticipantRepository: SpaceParticipantRepository;
  spaceMagicLinkTokenRepository: SpaceMagicLinkTokenRepository;
  spaceLocationRepository: SpaceLocationRepository;
  spaceInviteRepository: SpaceInviteRepository;
  spaceTokenSigner: SpaceTokenSigner;
  mailer: Mailer;
  tokenGenerator: TokenGenerator;
  clientOrigin: string;
  clientAppPath: string;
  isDevMode: boolean;
  inviteTokenTtlMs: number;
  inviteRateLimitWindowMs: number;
  inviteRateLimitMax: number;
  inviteMaxPerParticipant: number;
  eventEndAt: Date;
}

export function createSpaceRouter(deps: SpaceRouterDeps): Router {
  const router = Router();
  const requestSpaceMagicLink = createRequestSpaceMagicLinkUseCase(deps);
  const verifySpaceMagicLink = createVerifySpaceMagicLinkUseCase(deps);
  const inviteParticipant = createInviteParticipantUseCase(deps);
  const revokeInvite = createRevokeInviteUseCase(deps);
  const acceptInvite = createAcceptInviteUseCase(deps);
  const addLocation = createAddLocationUseCase(deps);
  const updateLocation = createUpdateLocationUseCase(deps);
  const deleteLocation = createDeleteLocationUseCase(deps);
  const removeMe = createRemoveMeUseCase(deps);

  const eventActive = requireEventActive(deps.eventEndAt);

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

  async function loadParticipant(req: Request, res: Response) {
    const participant = await deps.spaceParticipantRepository.findById(req.spaceSession!.participantId);
    if (!participant) {
      res.status(401).json({ error: "Invalid or expired session" });
      return null;
    }
    return participant;
  }

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
    eventActive,
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
    eventActive,
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

  router.post(
    "/:slug/invites/:token/accept",
    eventActive,
    spaceInviteAcceptRateLimiter,
    validateBody(acceptInviteSchema),
    asyncHandler(async (req, res) => {
      const space = await deps.spaceRepository.findBySlug(req.params.slug);
      if (!space) {
        res.status(404).json({ error: "Space not found" });
        return;
      }
      const { consent } = req.body as z.infer<typeof acceptInviteSchema>;
      try {
        const result = await acceptInvite(space, req.params.token, consent);
        res.json(result);
      } catch (err) {
        if (
          err instanceof InviteNotFoundError ||
          err instanceof InviteRevokedError ||
          err instanceof InviteAlreadyUsedError
        ) {
          res.status(400).json({ error: "Invalid or expired invite" });
          return;
        }
        if (err instanceof ConsentRequiredError) {
          res.status(400).json({ error: err.message });
          return;
        }
        if (err instanceof AlreadyParticipantError) {
          res.status(409).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    "/:slug/me",
    eventActive,
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      res.json({ participant: req.spaceSession });
    }),
  );

  router.delete(
    "/:slug/me",
    // Deliberately no eventActive gate - deletion/erasure keeps working even
    // after the event ends (TASK.md: fairness + GDPR withdrawal never expire).
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const participant = await loadParticipant(req, res);
      if (!participant) return;
      await removeMe(participant);
      res.status(204).send();
    }),
  );

  router.get(
    "/:slug/locations",
    eventActive,
    deps.requireSpaceAuth,
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const locations = await deps.spaceLocationRepository.findAllBySpace(space.id);
      // TASK.md section 6: "API responses use Cache-Control: private,
      // max-age=0, must-revalidate with an ETag" - a cheap weak ETag derived
      // from the data itself (count + the newest updatedAt), not a hash of the
      // body, so it changes exactly when the collection actually changes and
      // nothing else. private (session-specific auth header, not a shared
      // cache) + max-age=0 (always revalidate) + must-revalidate (never serve
      // stale on a revalidation failure) - the browser/service-worker cache
      // still gets to skip re-downloading the body via 304, which is the
      // actual bandwidth win.
      const newestUpdate = locations.reduce((max, l) => (l.updatedAt > max ? l.updatedAt : max), "");
      const etag = `W/"${locations.length}-${newestUpdate}"`;
      res.set("Cache-Control", "private, max-age=0, must-revalidate");
      res.set("ETag", etag);
      if (req.header("if-none-match") === etag) {
        res.status(304).end();
        return;
      }
      res.json({ locations });
    }),
  );

  router.post(
    "/:slug/locations",
    eventActive,
    deps.requireSpaceAuth,
    requireSpaceRole("participant"),
    validateBody(locationWriteSchema),
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const participant = await loadParticipant(req, res);
      if (!participant) return;
      const input = req.body as z.infer<typeof locationWriteSchema>;
      try {
        const location = await addLocation(participant, input);
        res.status(201).json({ location });
      } catch (err) {
        if (err instanceof LocationAlreadyExistsError || err instanceof LocationOwnershipError) {
          res.status(409).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.patch(
    "/:slug/locations/:id",
    eventActive,
    deps.requireSpaceAuth,
    requireSpaceRole("participant"),
    validateBody(locationWriteSchema),
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const participant = await loadParticipant(req, res);
      if (!participant) return;
      const input = req.body as z.infer<typeof locationWriteSchema>;
      try {
        const location = await updateLocation(participant, req.params.id, input);
        res.json({ location });
      } catch (err) {
        if (err instanceof LocationOwnershipError) {
          res.status(403).json({ error: err.message });
          return;
        }
        if (err instanceof LocationNotFoundError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.delete(
    "/:slug/locations/:id",
    eventActive,
    deps.requireSpaceAuth,
    requireSpaceRole("participant"),
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const participant = await loadParticipant(req, res);
      if (!participant) return;
      try {
        await deleteLocation(participant, req.params.id);
        res.status(204).send();
      } catch (err) {
        if (err instanceof LocationOwnershipError) {
          res.status(403).json({ error: err.message });
          return;
        }
        if (err instanceof LocationNotFoundError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    "/:slug/invites",
    eventActive,
    deps.requireSpaceAuth,
    requireSpaceRole("participant"),
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const requester = await loadParticipant(req, res);
      if (!requester) return;
      const invites = await deps.spaceInviteRepository.findAllByInviter(requester.id);
      // Never expose tokenHash - it's the only secret this record has, and
      // nothing on the client needs it (the raw token lives only in the
      // emailed link, never round-tripped back through this endpoint).
      res.json({ invites: invites.map(({ tokenHash: _tokenHash, ...rest }) => rest) });
    }),
  );

  router.post(
    "/:slug/invites",
    eventActive,
    deps.requireSpaceAuth,
    requireSpaceRole("participant"),
    spaceInviteRateLimiter,
    validateBody(inviteCreateSchema),
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const inviter = await loadParticipant(req, res);
      if (!inviter) return;
      const input = req.body as z.infer<typeof inviteCreateSchema>;
      try {
        res.status(201).json(await inviteParticipant(space, inviter, input));
      } catch (err) {
        if (err instanceof RoleEscalationError) {
          res.status(403).json({ error: err.message });
          return;
        }
        if (err instanceof InviteRateLimitError || err instanceof InviteCapExceededError) {
          res.status(429).json({ error: err.message });
          return;
        }
        if (err instanceof SpaceMailDeliveryError) {
          res.status(502).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.delete(
    "/:slug/invites/:id",
    eventActive,
    deps.requireSpaceAuth,
    requireSpaceRole("participant"),
    asyncHandler(async (req, res) => {
      const space = await loadOwnSpace(req, res);
      if (!space) return;
      const requester = await loadParticipant(req, res);
      if (!requester) return;
      try {
        await revokeInvite(req.params.id, requester.id);
        res.status(204).send();
      } catch (err) {
        if (err instanceof InviteOwnershipError) {
          res.status(403).json({ error: err.message });
          return;
        }
        if (err instanceof InviteNotFoundError) {
          res.status(404).json({ error: err.message });
          return;
        }
        if (err instanceof InviteAlreadyUsedError) {
          res.status(409).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
