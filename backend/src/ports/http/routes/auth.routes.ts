import { Router, type RequestHandler } from "express";
import {
  createInviteAccountUseCase,
  createRequestMagicLinkUseCase,
  createUpdateAccountUseCase,
  createVerifyMagicLinkUseCase,
  type InviteAccountDeps,
  type RequestMagicLinkDeps,
  type UpdateAccountDeps,
  type VerifyMagicLinkDeps,
} from "../../../application/auth/auth.use-cases.js";
import {
  AccountNotFoundError,
  DuplicateAccountError,
  MailDeliveryError,
  MemberAlreadyLinkedError,
  MemberNotFoundError,
} from "../../../application/auth/auth.errors.js";
import { requireRole } from "../middleware/require-role.js";
import { validateBody } from "../middleware/validate-body.js";
import { magicLinkRateLimiter, verifyRateLimiter } from "../middleware/rate-limit.js";
import {
  inviteAccountSchema,
  magicLinkRequestSchema,
  updateAccountSchema,
  verifyMagicLinkSchema,
} from "../validation/auth.schemas.js";
import { asyncHandler } from "../lib/async-handler.js";
import type { z } from "zod";

export type AuthRouterDeps = RequestMagicLinkDeps & VerifyMagicLinkDeps & InviteAccountDeps & UpdateAccountDeps & {
  requireAuth: RequestHandler;
};

export function createAuthRouter(deps: AuthRouterDeps): Router {
  const router = Router();
  const requestMagicLink = createRequestMagicLinkUseCase(deps);
  const verifyMagicLink = createVerifyMagicLinkUseCase(deps);
  const inviteAccount = createInviteAccountUseCase(deps);
  const updateAccount = createUpdateAccountUseCase(deps);

  router.post(
    "/magic-link",
    magicLinkRateLimiter,
    validateBody(magicLinkRequestSchema),
    asyncHandler(async (req, res) => {
      const { email } = req.body as z.infer<typeof magicLinkRequestSchema>;

      try {
        res.json(await requestMagicLink(email));
      } catch (err) {
        if (err instanceof MailDeliveryError) {
          res.status(502).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.post(
    "/verify",
    verifyRateLimiter,
    validateBody(verifyMagicLinkSchema),
    asyncHandler(async (req, res) => {
      const { token } = req.body as z.infer<typeof verifyMagicLinkSchema>;

      const result = await verifyMagicLink(token);
      if (!result) {
        res.status(400).json({ error: "Invalid or expired token" });
        return;
      }
      res.json(result);
    }),
  );

  router.get("/me", deps.requireAuth, (req, res) => {
    res.json({ account: req.account });
  });

  router.post(
    "/invite",
    deps.requireAuth,
    requireRole("leader"),
    validateBody(inviteAccountSchema),
    asyncHandler(async (req, res) => {
      const { email, role, memberId } = req.body as z.infer<typeof inviteAccountSchema>;

      try {
        const account = await inviteAccount({ email, role, memberId });
        res.status(201).json({ account });
      } catch (err) {
        if (err instanceof DuplicateAccountError || err instanceof MemberAlreadyLinkedError) {
          res.status(409).json({ error: err.message });
          return;
        }
        if (err instanceof MemberNotFoundError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    "/accounts",
    deps.requireAuth,
    requireRole("leader"),
    asyncHandler(async (_req, res) => {
      const accounts = await deps.accountRepository.findAll();
      res.json({ accounts });
    }),
  );

  router.patch(
    "/accounts/:id",
    deps.requireAuth,
    requireRole("leader"),
    validateBody(updateAccountSchema),
    asyncHandler(async (req, res) => {
      const { role, memberId } = req.body as z.infer<typeof updateAccountSchema>;

      try {
        const account = await updateAccount(
          { accountId: req.params.id, role, memberId },
          req.account!.accountId,
        );
        res.json({ account });
      } catch (err) {
        if (err instanceof MemberAlreadyLinkedError) {
          res.status(409).json({ error: err.message });
          return;
        }
        if (err instanceof MemberNotFoundError || err instanceof AccountNotFoundError) {
          res.status(404).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
