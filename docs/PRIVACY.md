# Privacy & data handling

This is the privacy program for Visual Directory: what personal data the app holds,
why, who can see it, how long it's kept, and what happens when someone asks about
their own data. It has two audiences — members (the "Privacy notice" section, written
for them directly) and whoever runs the directory (the "Data handling policy"
section, written as an operating procedure).

This document is an engineering-informed starting point, not legal advice. The
"Open decisions" section below lists the calls only the organization running this
directory can make — read that section first.

## Open decisions (read this first)

Two questions this document can't answer for you, because they depend on facts
about your specific organization and members, not on the code:

1. **Does any member live in the EU or UK?** If so, GDPR / UK GDPR applies to their
   data no matter where the server runs (it currently runs on Hetzner's EU cloud —
   see `docs/ABOUT.md` — which helps, but doesn't by itself satisfy every
   requirement).
2. **Does membership in this directory reveal something like religious or political
   affiliation?** Several privacy regimes treat that as a "special category" of
   data requiring a stricter legal basis (often explicit consent) to process at all.

Write down the answers — even a one-paragraph decision, kept somewhere durable —
before growing the membership list further. Everything else in this document
assumes those answers exist; it doesn't supply them.

## Privacy notice (for members)

### What we collect

When a leader adds you to the directory, it can include:

- Your name
- Your home address and its map coordinates
- Your phone number and/or email
- Which group you belong to and your role in it
- Whether you're marked as an active or lost-contact member

If you're invited to sign in yourself, we also store the email address you sign in
with and whether your account is a `member` or `leader`.

### Why we collect it

Solely to run the directory itself: so leaders can find and coordinate with members
by location and organization, and so members can be reached. Nothing here is used
for advertising, analytics, or shared with a third party for their own purposes.

### Who can see it

Any signed-in account — member or leader — can see the full directory: every
member's address and contact details, not a redacted subset. Only leaders can add,
edit, or remove entries. This is a deliberate design choice for a small,
trust-based organization (see `CLAUDE.md`), not an oversight — but it does mean
"logged in" is the only access boundary. There is no per-member privacy setting.

### Who else sees it

- **Resend** (or, in local development, no one — see `docs/RESEND_EMAIL_SETUP.md`)
  delivers the sign-in emails and briefly sees the recipient's email address to do
  so.
- **Hetzner** hosts the database, on EU infrastructure.
- No one else. There's no analytics vendor, ad network, or third-party integration
  in this app.

### How long we keep it

There isn't yet an automatic deletion schedule — see "Retention" below for the
policy an operator should set. In the meantime, data is kept until a leader removes
it by hand.

### One thing we can't fully undo

Every change to a member's record is written to an append-only, tamper-evident
audit log (`backend/src/infrastructure/prisma/audit-log.ts`) — that's what lets the
organization detect if a record was altered improperly. The tradeoff: deleting a
member's row removes it from the live directory, but the audit log's historical
entries (which include what the data used to be) are not erased, by design — erasing
them would break the tamper-evidence chain for every entry after them. If a member
asks for full erasure, this limitation should be explained to them plainly rather
than promising something the system doesn't do.

### Your options

Contact whoever leads your organization (they're a `leader` account) to:

- See what's on file for you
- Correct it
- Have your live record removed (subject to the audit-log caveat above)

## Data handling policy (for whoever operates this directory)

### Retention

Set an explicit retention rule and write it here once decided — for example,
"members marked lost-contact for more than N years are removed," or "kept
indefinitely while the organization exists." Undecided is not the same as
indefinite; make the choice on purpose.

This Postgres database is not intended to be the long-term system of record —
the plan is to eventually ingest membership data from Asana instead, at which
point this instance becomes a derived copy rather than the source of truth.
Until that migration happens, it *is* the only copy, and there is currently no
backup of it at all (see `docs/HETZNER_DEPLOY.md` § Backups). That's an accepted
interim tradeoff, not an oversight — but it means data here can currently be
destroyed on purpose and not recovered, which is exactly the fail-safe this
project is relying on in place of a backup: `docker compose down --volumes` (or
`docker volume rm visual-directory_postgres-data`) permanently deletes
everything in it. A plain `docker compose down`, without `--volumes`, does
**not** do this — the data survives a normal restart.

### Deletion requests

1. Confirm the requester's identity through your organization's normal channel
   (not solely an unauthenticated email, to avoid someone impersonating a member to
   get their data removed or exfiltrated).
2. A leader deletes the member via the existing UI/API
   (`DELETE /members/:id`) or account (`PATCH /auth/accounts/:id`).
3. Tell the requester plainly that the deletion is scoped to their live record —
   the audit log retains historical entries referencing them, per the tradeoff
   above.

### Access requests ("what do you have on me?")

Any account linked to a member record (`Account.memberId` set) can self-serve this:
the Privacy dialog (About → Privacy, also shown pre-login) has an "Export my data"
button that downloads a `my-data.json` with exactly the fields listed in "What we
collect" above — name, address, phone/email, organization/role, status, signup
date, plus the sign-in email and account role
(`frontend/application/member/member-export.ts`). A leader-only account (no
`memberId`) has nothing to export this way and won't see the button.

For a leader-only account, or anyone who'd rather not self-serve, a leader can
still look up the member's record directly (map or organization view) and share it
with the requester by hand.

### Sub-processors

- **Resend** — transactional email delivery for magic links. See
  `docs/RESEND_EMAIL_SETUP.md`.
- **Hetzner** — database and API hosting, EU region.
- **GitHub Pages** — hosts the static frontend; receives no member data itself (the
  frontend talks to the API directly from the visitor's browser).

Review this list whenever a new integration is added — anything that receives member
data belongs here.

### Security measures backing this policy

Documented in full in the security audit; the short version relevant to a privacy
review:

- Passwordless sign-in; only a hash of each sign-in token is ever stored.
- Every write is attributed to an account and recorded in the audit log.
- Read/write access is role-gated on the server, not just hidden in the UI.
- Secrets never enter the repository; production credentials live only in GitHub
  Actions secrets and a `600`-permission file on the server.

### Incident response

If the database is exposed or an account (leader or member) is compromised:

1. **Point of contact**: the developer/operator, who also holds a `member` account
   in the directory, is the designated contact and decision-maker for any incident.
   There's no separate on-call rotation or IT contact beyond them at this org's
   current size — if that changes, update this section rather than leaving it stale.
2. **Notifying affected members**: out-of-band first — phone, in-person, or another
   channel outside this app — not email by default. Email (via Resend, the same
   path as magic links) is a fallback only, used once a genuine out-of-band attempt
   has actually been made and didn't reach someone, not as the first resort. The
   reasoning: a compromise here could mean email itself isn't trustworthy for this
   purpose, and this organization is small enough that direct contact is practical.
3. **Regulatory notification**: if any affected member is in the EU/UK (see "Open
   decisions" above), GDPR/UK GDPR requires notifying the relevant supervisory
   authority within 72 hours of becoming aware of the breach. Confirm which
   authority applies *before* an incident, not during one — that's not a call this
   document can make for you.
4. **What starts the clock**: the moment there's a reasonable basis to believe
   personal data was exposed, not confirmed proof. Investigate promptly, but don't
   wait for certainty before starting notification.

### Review

Re-read this document whenever the schema in `backend/prisma/schema.prisma` gains a
new personal-data field, or whenever a new sub-processor is introduced.
