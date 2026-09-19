import type { Member, MemberResponsibilityRole } from "domain/member/member.types.ts";
import type { Account, Role } from "infrastructure/redux/auth/auth.slice.ts";

export type MemberDataExport = {
  name: string;
  address: Member["address"] | null;
  phone: string | null;
  contactEmail: string | null;
  organization: string | null;
  role: MemberResponsibilityRole | null;
  status: "active" | "lost-contact";
  lastActiveDate: string | null;
  signupDate: string;
  signInEmail: string;
  accountRole: Role;
};

// The "what do you have on me" self-service export (docs/PRIVACY.md's "Access
// requests" section) - every field docs/PRIVACY.md's "What we collect" lists,
// exactly as stored, so it's the same answer a leader would give by hand.
export function buildMemberDataExport(
  member: Member,
  account: Account,
  organizationName: string | null,
): MemberDataExport {
  return {
    name: `${member.name.firstName} ${member.name.lastName}`,
    address: member.address ?? null,
    phone: member.contact?.telephone ?? null,
    contactEmail: member.contact?.email ?? null,
    organization: organizationName,
    role: member.responsibility ?? null,
    status: member.status.kind,
    lastActiveDate: member.status.kind === "lost-contact" ? member.status.lastActiveDate : null,
    signupDate: member.signupDate,
    signInEmail: account.email,
    accountRole: account.role,
  };
}
