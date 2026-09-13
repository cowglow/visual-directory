import { z } from "zod";
import { roleSchema, uuidSchema } from "./shared.schemas.js";

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1).max(512),
});

export const inviteAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: roleSchema,
  memberId: uuidSchema.optional(),
});

export const updateAccountSchema = z.object({
  role: roleSchema,
  memberId: uuidSchema.nullable().optional(),
});
