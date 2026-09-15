import { z } from "zod";
import type { FieldDef } from "../../../domain/space/space.types.js";

export const spaceCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "use lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(1).max(200),
});

const fieldTypeSchema = z.enum(["text", "textarea", "boolean", "select", "time-range", "address"]);

const fieldDefSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[a-zA-Z0-9_]+$/, "use letters, numbers, and underscores only"),
    label: z.string().trim().min(1).max(200),
    type: fieldTypeSchema,
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  })
  .refine((field) => field.type !== "select" || (field.options && field.options.length > 0), {
    message: "select fields need at least one option",
    path: ["options"],
  });

export const eventCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "use lowercase letters, numbers, and hyphens only"),
  title: z.string().trim().min(1).max(200),
  kind: z.string().trim().min(1).max(80),
  fieldSchema: z.array(fieldDefSchema).min(1).max(30),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
});

// A geolocated address field stores a small object, not a bare string - see
// domain/space/space.types.ts's AddressValue. lat/lng are only present when
// the participant used the sign-up form's "use my location" button; a
// hand-typed address is just as valid with both left null.
const addressValueSchema = z.object({
  text: z.string().trim().max(500),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

// Built per-request from an event's own stored fieldSchema - can't be a static
// export like the schemas above since it depends on data read from the
// database, not just the request shape. Used by both the create and update
// entry routes.
export function buildEntryDataSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let valueSchema: z.ZodTypeAny;
    switch (field.type) {
      case "boolean":
        valueSchema = field.required ? z.boolean() : z.boolean().optional();
        break;

      case "address":
        valueSchema = field.required
          ? addressValueSchema.refine((value) => value.text.length > 0, { message: "Required", path: ["text"] })
          : addressValueSchema.optional();
        break;

      case "select": {
        const enumSchema = field.options && field.options.length > 0 ? z.enum(field.options as [string, ...string[]]) : z.string();
        // A form commonly submits "" for a field the person left blank, same
        // convention as ports/http/validation/member.schemas.ts's contact.email -
        // "" means "not answered," not an invalid value.
        valueSchema = field.required ? enumSchema : z.union([enumSchema, z.literal("")]).optional();
        break;
      }

      case "textarea": {
        const stringSchema = z.string().trim().max(2000);
        valueSchema = field.required ? stringSchema.min(1) : z.union([stringSchema, z.literal("")]).optional();
        break;
      }

      case "text":
      case "time-range":
      default: {
        const stringSchema = z.string().trim().max(500);
        valueSchema = field.required ? stringSchema.min(1) : z.union([stringSchema, z.literal("")]).optional();
        break;
      }
    }

    shape[field.key] = valueSchema;
  }

  return z.object(shape);
}
