// Mirrors backend/src/domain/space/space.types.ts - this is a separate package
// from the backend (see CLAUDE.md), so, like every other domain type in this
// app, it's duplicated rather than shared.

export type FieldType = "text" | "textarea" | "boolean" | "select" | "time-range" | "address";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
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
