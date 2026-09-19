import { describe, expect, it } from "vitest";
import { buildMemberDataExport } from "application/member/member-export.ts";
import type { Member } from "domain/member/member.types.ts";
import type { Account } from "infrastructure/redux/auth/auth.slice.ts";

const account: Account = {
  id: "account-1",
  email: "member@example.com",
  role: "member",
  memberId: "member-1",
};

const member: Member = {
  id: "member-1",
  name: { firstName: "Jane", lastName: "Doe" },
  address: {
    street: "Main St",
    number: "12",
    zip: 90210,
    city: "Springfield",
    coordinates: { lat: 1.23, lng: 4.56 },
  },
  contact: { telephone: "555-1234", email: "jane@example.com" },
  responsibility: { level: "Group", type: "MD" },
  organizationId: "org-1",
  signupDate: "2024-01-01",
  status: { kind: "active" },
};

describe("buildMemberDataExport", () => {
  it("includes every field PRIVACY.md's 'What we collect' section names", () => {
    const result = buildMemberDataExport(member, account, "Springfield Group");

    expect(result).toEqual({
      name: "Jane Doe",
      address: {
        street: "Main St",
        number: "12",
        zip: 90210,
        city: "Springfield",
        coordinates: { lat: 1.23, lng: 4.56 },
      },
      phone: "555-1234",
      contactEmail: "jane@example.com",
      organization: "Springfield Group",
      role: { level: "Group", type: "MD" },
      status: "active",
      lastActiveDate: null,
      signupDate: "2024-01-01",
      signInEmail: "member@example.com",
      accountRole: "member",
    });
  });

  it("reports a lost-contact date and omits fields the member record doesn't have", () => {
    const lostContactMember: Member = {
      ...member,
      address: undefined,
      contact: undefined,
      organizationId: undefined,
      status: { kind: "lost-contact", lastActiveDate: "2023-06-15" },
    };

    const result = buildMemberDataExport(lostContactMember, account, null);

    expect(result.address).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.contactEmail).toBeNull();
    expect(result.organization).toBeNull();
    expect(result.status).toBe("lost-contact");
    expect(result.lastActiveDate).toBe("2023-06-15");
  });
});
