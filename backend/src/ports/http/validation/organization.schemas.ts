import { z } from "zod";
import { organizationTypeSchema, uuidSchema } from "./shared.schemas.js";

export const organizationInputSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1).max(200),
  type: organizationTypeSchema,
  parentId: uuidSchema.optional(),
});
