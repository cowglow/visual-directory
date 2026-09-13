import { Router, type RequestHandler } from "express";
import type { OrganizationRepository } from "../../../application/organization/organization.repository.js";
import type { OrganizationInput } from "../../../domain/organization/organization.types.js";
import { requireRole } from "../middleware/require-role.js";
import { validateBody } from "../middleware/validate-body.js";
import { organizationInputSchema } from "../validation/organization.schemas.js";
import { asyncHandler } from "../lib/async-handler.js";

export interface OrganizationRouterDeps {
  requireAuth: RequestHandler;
  organizationRepository: OrganizationRepository;
}

export function createOrganizationRouter({ requireAuth, organizationRepository }: OrganizationRouterDeps): Router {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    asyncHandler(async (_req, res) => {
      const organizations = await organizationRepository.findAll();
      res.json({ organizations });
    }),
  );

  router.post(
    "/",
    requireAuth,
    requireRole("leader"),
    validateBody(organizationInputSchema),
    asyncHandler(async (req, res) => {
      const input = req.body as OrganizationInput;
      const organization = await organizationRepository.create(input, req.account!.accountId);
      res.status(201).json({ organization });
    }),
  );

  router.put(
    "/:id",
    requireAuth,
    requireRole("leader"),
    validateBody(organizationInputSchema),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const input = req.body as OrganizationInput;
      const organization = await organizationRepository.update(id, input, req.account!.accountId);
      if (!organization) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }
      res.json({ organization });
    }),
  );

  router.delete(
    "/:id",
    requireAuth,
    requireRole("leader"),
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const deleted = await organizationRepository.delete(id, req.account!.accountId);
      if (!deleted) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }
      res.status(204).send();
    }),
  );

  return router;
}
