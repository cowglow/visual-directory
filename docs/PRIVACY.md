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

A leader can look up the member's record directly (map or organization view) and
share it with the requester. There's no self-service export yet; if this becomes a
frequent request, it's a reasonable feature to build (a member reading their own
record already has partial precedent — see `docs/PLAN.md`'s "Members editing their
own record," currently deferred).

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

Not yet written. At minimum, decide and record: who gets notified if the database
is exposed or a leader account is compromised, and within what timeframe — some
privacy regimes (GDPR included) impose a hard deadline (72 hours) for notifying a
regulator once you're aware of a personal-data breach.

### Review

Re-read this document whenever the schema in `backend/prisma/schema.prisma` gains a
new personal-data field, or whenever a new sub-processor is introduced.
