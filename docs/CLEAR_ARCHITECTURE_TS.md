# Clear Architecture, as applied in this repo (TypeScript companion)

This repo's architectural style is Joschi Kuphal's **Clear Architecture** —
<https://github.com/jkphl/clear-architecture/blob/master/README.md>. Read that
original for the underlying *concepts*: the three tiers, the Dependency Rule, the
Dependency Inversion Principle. This document is the concrete mapping of those
concepts onto this codebase, kept separate (rather than copied and edited inline)
to avoid drifting out of sync with the upstream write-up. It exists because the
upstream doc's own conventions — `UpperCamelCase` directories, an
`Interface`/`Trait` suffix convention, a separate `Tests` tier — were never adopted
here and would be actively misleading if followed literally. This document takes
precedence over the upstream one wherever they disagree about *this* codebase.

Scope: this covers both `frontend/` and `backend/` — see "How the backend applies
this" below for where the backend's shape differs from the frontend's (Express
routes standing in for React components, repository interfaces standing in for
Redux slices) while still following the same tiers and Dependency Rule.

## Directory mapping

| Upstream tier | Upstream convention | This repo (frontend) | This repo (backend) | Example |
|---|---|---|---|---|
| ① Domain | `<Module>/Domain/` | `frontend/domain/` | `backend/src/domain/` | `domain/member/member.types.ts` |
| ② Application | `<Module>/Application/` | `frontend/application/` | `backend/src/application/` | `application/csv/member.csv.ts` |
| ③ Ports | `<Module>/Ports/` | `frontend/ports/` | `backend/src/ports/` | `ports/components/map/MembersMap.tsx` |
| ③ Infrastructure | `<Module>/Infrastructure/` | `frontend/infrastructure/` | `backend/src/infrastructure/` | `infrastructure/redux/member/member.slice.ts` |
| ③ Tests | `<Module>/Tests/` | **no separate tier** — colocated `*.test.ts` | same | `domain/member/member.factory.test.ts` |

The Dependency Rule itself is unchanged: domain has zero imports from application,
infrastructure, or ports; application may import domain but not infrastructure/ports;
infrastructure and ports may import inward (domain, application) but not each other
sideways except through each side's composition root (frontend: `store.ts`,
`main.tsx`; backend: `composition-root.ts`, `index.ts`).

**This is convention only — nothing lints or type-checks it.** There's no ESLint
import-boundary rule (`eslint.config.js` has no `no-restricted-imports` /
`import/no-internal-modules` setup) enforcing the Dependency Rule; a future PR could
violate it and nothing would catch it automatically. Worth adding if a violation
actually happens — not speculatively.

## Naming conventions that differ from the upstream doc

- **Directories and files are lowercase, kebab/dot-separated**, not `UpperCamelCase`:
  `domain/member/`, `member.factory.ts`, `member.types.ts` — not `Domain/Member/`,
  `MemberFactory.ts`. React component files are the one exception, in ordinary React
  style: `PascalCase.tsx` (`MembersMap.tsx`, `BottomNav.tsx`), including the
  dot-separated variants for a family of related components sharing a concept
  (`Map.Marker.tsx`, `Marker.Member.tsx`, `Marker.OwnPosition.tsx`).
- **No `Interface`/`Trait` suffix convention.** TypeScript's structural typing makes
  the suffix redundant — an interface is named for what it models (`Mailer`, not
  `MailerInterface`; `GeoCoordinate`, not `GeoCoordinateInterface`), on both sides of
  the stack (`backend/src/application/mailer.ts`'s `Mailer` follows the same rule).
- **Factories keep the upstream's `create*` prefix convention** — this part *did*
  carry over cleanly: `createMember`, `createOrganization`, `createIncompleteMember`
  (`domain/*/‍*.factory.ts`). Non-creation domain operations are named for the verb,
  not prefixed: `markComplete`, `assignOrganization`, `markLostContact`.
- **Frontend: absolute imports from `frontend/`, always with an explicit extension**:
  `"domain/member/member.types.ts"`, never a relative `../../domain/...` and never
  extension-less. This is `baseUrl: "./frontend"` in the root `tsconfig.json` plus the
  `vite-tsconfig-paths` plugin — not a bundler alias to reproduce in a different build
  tool, and not Node's own resolution (Vite handles it at dev/build time). The backend
  doesn't have an equivalent plugin available under plain `tsc`/`tsx`, so it keeps
  ordinary relative, extension-ful imports (NodeNext's own convention, e.g.
  `"../domain/member/member.types.js"`) — an intentional, documented divergence, not
  an oversight; the Dependency Rule the imports encode is what matters, not their
  spelling.

## `infrastructure/redux/`: the dominant infrastructure pattern

Redux Toolkit slices are the concrete "Infrastructure" components for this app's
state: one `<domain>.slice.ts` + `<domain>.selectors.ts` pair per domain
(`member/`, `organization/`, `auth/`, `selection/`, `windows/`), combined into the
root reducer in `store.ts`.

**Async flows go through `redux-saga`, not thunks that call `fetch` themselves.** A
slice's reducers are plain, synchronous state transitions only — a `*Requested`
action, its matching `*Succeeded`/`*Failed`, and (once done) a `reset*` action.
The actual `apiFetch` call lives in a sibling `<domain>.saga.ts`, which `takeEvery`s
the `*Requested` action, performs the call via `call()`, and `put()`s the outcome.
`infrastructure/redux/sagas.ts`'s `watchSaga` forks every domain saga; look at
`member.saga.ts` for the fullest example (fetch, add/update/remove, and a bulk
"import" flow using `select()` to read current state mid-saga).

**Components are state-driven, not promise-driven.** A component dispatches a
`*Requested` action and reacts to the slice's status field in a `useEffect`, rather
than `await`ing a thunk. Where more than one instance of a component can have a
mutation in flight at once (e.g. every `Marker.Member.tsx` on the map can drag-move
independently), each request carries a `requestId` from
`infrastructure/redux/request-id.ts`, and the component only reacts once the slice's
`mutationRequestId` matches the one *it* dispatched — see `MemberForm.tsx` and
`Marker.Member.tsx` for the two shapes this takes (a single-shot form vs. many
concurrent map markers). `infrastructure/redux/mutation-status.ts` holds the shared
`MutationStatus` type this pattern is built on.

## `ports/`: grouped by feature, not by technical role

`ports/components/` is organized by feature area (`map/`, `markers/`, `forms/`,
`dialogs/`, `windows/`, `auth/`, `organization-tree/`, `action-menu/`), not by a
generic `components/` bucket with everything flat, nor split by
container/presentational. `ports/context/` (React context providers — dialogs, i18n,
tile server config), `ports/hooks/`, `ports/i18n/`, `ports/config/` (menu and dialog
wiring), and `ports/testing/` (Storybook fixtures shared across stories) round out
the tier.

## Testing

No separate `Tests` tier directory. Unit tests are colocated as `<name>.test.ts`
beside the file they test (`member.factory.test.ts` next to `member.factory.ts`).
`vitest.config.ts` only collects `*.test.ts`, not `*.test.tsx` — component-level
correctness is instead verified live (Storybook stories + a Playwright driver against
the dev server), not through component unit tests. `e2e/*.spec.ts` is the one
exception: real frontend + real backend + real Postgres, single-worker.

## How the backend applies this

`backend/src/` follows the same four tiers, shaped around Express + Prisma instead
of React + Redux:

- **`domain/`** — `member/`, `organization/`, `account/` types (mirroring the API's
  JSON shape, which is also the frontend's own domain shape); `shared/types.ts`
  (`Role`, `OrganizationType`, `DepartmentType` — literal unions, deliberately *not*
  imported from `@prisma/client`, since a generated ORM type is an infrastructure
  concern); `audit/` (`canonicalJson`, `computeAuditHash` — the pure
  `hash = sha256(prevHash + canonicalJson(entry))` rule); `auth/magic-link.ts`
  (`TOKEN_TTL_MS`, `hashToken`, the `isTokenUsable` predicate). Generating a random
  token (`crypto.randomBytes`) is infrastructure, not domain — it depends on a source
  of randomness; hashing one deterministically is a domain rule.
- **`application/`** — a `*.repository.ts` interface per aggregate (`MemberRepository`,
  `OrganizationRepository`, `AccountRepository`, `MagicLinkTokenRepository`) that
  `ports/http`'s routes depend on and `infrastructure/prisma/*.repository.ts`
  implements — this is the Dependency Inversion Principle in practice: a
  higher-level layer (ports) needs a lower-level capability (persistence), so it
  depends on an interface *application* owns, not the concrete Prisma
  implementation. `mailer.ts` and `token-signer.ts` are the same pattern for email
  and JWTs. `auth/auth.use-cases.ts` holds the one piece of real cross-repository
  orchestration in this backend (`requestMagicLink` coordinates the account lookup,
  token creation, and mailer call; `verifyMagicLink` coordinates the token lookup,
  the domain's `isTokenUsable` check, and session signing; `inviteAccount` coordinates
  account + member existence checks). Member and organization CRUD don't get a
  separate use-case layer on top of their repository interface — each operation
  really is just "write + one audit-log entry," which the repository interface
  already captures in full; introduce a use-case file the day an operation needs to
  coordinate more than one repository.
- **`infrastructure/prisma/`** — one repository implementation per interface, each
  owning the Prisma-flat-columns ↔ domain-shape mapping (`toDomainMember`, etc.) and
  wrapping its own writes in `prisma.$transaction` together with
  `appendAuditLog` (also here) — so "a write and its audit entry commit atomically"
  stays a persistence-implementation detail the application layer never has to know
  the shape of, rather than a cross-cutting "unit of work" abstraction threaded
  through every use case. `infrastructure/mail/` (`consoleMailer`, `resendMailer`,
  `getMailer()`) and `infrastructure/auth/` (`jwtTokenSigner`, `randomTokenGenerator`)
  are the same pattern for their respective interfaces.
- **`ports/http/`** — Express is the delivery mechanism. `routes/*.routes.ts` are
  factories (`createMemberRouter(deps)`) that parse the request, call the injected
  repository/use-case, and shape the response — including the few checks that are
  genuinely HTTP-authorization concerns rather than business rules (e.g. member PUT's
  "leader, or editing your own linked record" check). `middleware/require-auth.ts` is
  also a factory (`createRequireAuth(tokenSigner)`) for the same reason every route
  is: nothing in `ports/` imports a concrete infrastructure implementation directly.
  `app.ts` wires the routers together; it takes a fully-built `AppDeps` object rather
  than constructing anything itself.
- **Composition root** — `composition-root.ts`'s `buildAppDeps()` is the one place
  concrete infrastructure (`prismaMemberRepository`, `jwtTokenSigner`, `getMailer()`,
  ...) gets instantiated and wired into the interfaces `application`/`ports` depend
  on; `index.ts` just calls it and starts listening.

No separate `Tests` tier here either — `domain/audit/canonical-json.test.ts` sits
beside the file it tests, same as the frontend.

**This wasn't retrofitted for its own sake.** The trigger was needing the backend to
actually apply the same architecture as the frontend rather than being a flat,
technical-concern-grouped Express app (routes/auth/db/audit/lib) with real
business rules — the audit hash chain, the magic-link TTL/single-use rule, the
member/organization shape mapping — scattered directly inside route handlers with no
seam for testing or swapping the persistence layer. The repository interfaces are
the direct payoff: `application/` can be reasoned about (and unit-tested) without a
running Postgres, and swapping Prisma for something else would only ever touch
`infrastructure/prisma/`.
