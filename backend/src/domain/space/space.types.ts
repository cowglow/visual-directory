// Pure types for the opt-in signup feature (Spaces/Events/Entries) - see
// backend/prisma/schema.prisma for the persisted shape these mirror. Kept
// framework-free like every other domain type; the Zod schemas built from
// FieldDef live at the ports/http boundary (ports/http/validation/space.schemas.ts),
// not here.

export type FieldType = "text" | "textarea" | "boolean" | "select" | "time-range" | "address";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  // "select" only.
  options?: string[];
};

// The shape an entry stores for a FieldDef of type "address" - text is always
// present (what's shown/printed/sorted-by), lat/lng are filled in only when
// the participant used the sign-up form's "use my location" button rather
// than typing the address by hand.
export type AddressValue = {
  text: string;
  lat: number | null;
  lng: number | null;
};

export type Space = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
};

export type SpaceParticipant = {
  id: string;
  spaceId: string;
  email: string;
  displayName: string | null;
};

export type OptInEvent = {
  id: string;
  spaceId: string;
  slug: string;
  title: string;
  kind: string;
  fieldSchema: FieldDef[];
  opensAt: string | null;
  closesAt: string | null;
};

export type OptInEntry = {
  id: string;
  eventId: string;
  participantId: string;
  addressLabel: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

// The token payload minted for a participant's session - deliberately shaped
// nothing like application/token-signer.ts's SessionPayload (no accountId,
// role, memberId) so the two can never be confused for one another even if a
// verify step forgot to check `scope`.
export type SpaceSessionPayload = {
  scope: "space";
  participantId: string;
  spaceId: string;
  email: string;
};
