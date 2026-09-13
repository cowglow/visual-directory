import { Router, type RequestHandler } from "express";
import type { MemberRepository } from "../../../application/member/member.repository.js";
import type { MemberInput } from "../../../domain/member/member.types.js";
import { requireRole } from "../middleware/require-role.js";
import { validateBody } from "../middleware/validate-body.js";
import { memberInputSchema } from "../validation/member.schemas.js";
import { asyncHandler } from "../lib/async-handler.js";

export interface MemberRouterDeps {
  requireAuth: RequestHandler;
  memberRepository: MemberRepository;
}

export function createMemberRouter({ requireAuth, memberRepository }: MemberRouterDeps): Router {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    asyncHandler(async (_req, res) => {
      const members = await memberRepository.findAll();
      res.json({ members });
    }),
  );

  router.post(
    "/",
    requireAuth,
    requireRole("leader"),
    validateBody(memberInputSchema),
    asyncHandler(async (req, res) => {
      const input = req.body as MemberInput;
      const member = await memberRepository.create(input, req.account!.accountId);
      res.status(201).json({ member });
    }),
  );

  router.put(
    "/:id",
    requireAuth,
    validateBody(memberInputSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      if (req.account!.role !== "leader" && req.account!.memberId !== id) {
        res.status(403).json({ error: "Requires leader role or editing your own linked record" });
        return;
      }
      const input = req.body as MemberInput;
      const member = await memberRepository.update(id, input, req.account!.accountId);
      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      res.json({ member });
    }),
  );

  router.delete(
    "/:id",
    requireAuth,
    requireRole("leader"),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const deleted = await memberRepository.delete(id, req.account!.accountId);
      if (!deleted) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      res.status(204).send();
    }),
  );

  return router;
}
