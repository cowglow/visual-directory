import { z } from "zod";
import { departmentTypeSchema, organizationTypeSchema, uuidSchema } from "./shared.schemas.js";

const memberAddressSchema = z.object({
  street: z.string().max(200),
  number: z.string().max(20),
  zip: z.number().int(),
  city: z.string().max(120),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

const memberStatusSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("active") }),
  z.object({ kind: z.literal("lost-contact"), lastActiveDate: z.string() }),
]);

export const memberInputSchema = z.object({
  id: uuidSchema.optional(),
  name: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
  }),
  address: memberAddressSchema.optional(),
  contact: z
    .object({
      telephone: z.string().max(40).optional(),
      email: z.string().trim().toLowerCase().email().max(254).optional(),
    })
    .optional(),
  responsibility: z
    .object({ level: organizationTypeSchema, type: departmentTypeSchema })
    .optional(),
  organizationId: uuidSchema.optional(),
  status: memberStatusSchema,
  incomplete: z.boolean().optional(),
});
