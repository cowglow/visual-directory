import { z } from "zod";

// Mirror the enums in domain/shared/types.ts by value (same reasoning as that file:
// kept independent rather than derived, so a schema drift shows up as a type error
// where a route imports both).
export const organizationTypeSchema = z.enum(["Region", "Headquarter", "Area", "District", "Group"]);
export const departmentTypeSchema = z.enum(["MD", "WD", "JMD", "JWD"]);
export const roleSchema = z.enum(["member", "leader"]);
export const uuidSchema = z.string().uuid();
