// The one place concrete infrastructure gets wired into the application/ports
// layers — everything else in this codebase depends on interfaces, not on Prisma,
// jsonwebtoken, or Resend directly. See docs/CLEAR_ARCHITECTURE_TS.md.
import type { AppDeps } from "./ports/http/app.js";
import { createRequireAuth } from "./ports/http/middleware/require-auth.js";
import { prismaMemberRepository } from "./infrastructure/prisma/member.repository.js";
import { prismaOrganizationRepository } from "./infrastructure/prisma/organization.repository.js";
import { prismaAccountRepository } from "./infrastructure/prisma/account.repository.js";
import { prismaMagicLinkTokenRepository } from "./infrastructure/prisma/magic-link-token.repository.js";
import { getMailer } from "./infrastructure/mail/get-mailer.js";
import { jwtTokenSigner } from "./infrastructure/auth/jwt-token-signer.js";
import { randomTokenGenerator } from "./infrastructure/auth/token-generator.js";
import { createRequireSpaceAuth } from "./ports/http/middleware/require-space-auth.js";
import { prismaSpaceParticipantRepository, prismaSpaceRepository } from "./infrastructure/prisma/space.repository.js";
import { prismaSpaceMagicLinkTokenRepository } from "./infrastructure/prisma/space-magic-link-token.repository.js";
import { prismaSpaceLocationRepository } from "./infrastructure/prisma/space-location.repository.js";
import { prismaSpaceInviteRepository } from "./infrastructure/prisma/space-invite.repository.js";
import { spaceJwtTokenSigner } from "./infrastructure/auth/space-jwt-token-signer.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
// Must match vite.config.ts's `base` — the SPA is served from this subpath
// (a GitHub Pages project page), not from CLIENT_ORIGIN's root.
const CLIENT_APP_PATH = "/visual-directory";

const DAY_MS = 24 * 60 * 60 * 1000;

// TASK.md section 2/3: all configurable via env, all with sane defaults so a
// fresh checkout works without setting anything.
const INVITE_TOKEN_TTL_MS = Number(process.env.SPACE_INVITE_TTL_MS ?? 7 * DAY_MS);
const INVITE_RATE_LIMIT_WINDOW_MS = Number(process.env.SPACE_INVITE_RATE_LIMIT_WINDOW_MS ?? 60 * 60 * 1000);
const INVITE_RATE_LIMIT_MAX = Number(process.env.SPACE_INVITE_RATE_LIMIT_MAX ?? 10);
const INVITE_MAX_PER_PARTICIPANT = Number(process.env.SPACE_INVITE_MAX_PER_PARTICIPANT ?? 50);
// Midnight after Halloween, Europe/Berlin (TASK.md section 3).
const EVENT_END_AT = new Date(process.env.EVENT_END_AT ?? "2026-11-01T00:00:00+01:00");

export function buildAppDeps(): AppDeps {
  return {
    requireAuth: createRequireAuth(jwtTokenSigner, prismaAccountRepository),
    memberRepository: prismaMemberRepository,
    organizationRepository: prismaOrganizationRepository,
    accountRepository: prismaAccountRepository,
    magicLinkTokenRepository: prismaMagicLinkTokenRepository,
    mailer: getMailer(),
    tokenSigner: jwtTokenSigner,
    tokenGenerator: randomTokenGenerator,
    clientOrigin: CLIENT_ORIGIN,
    clientAppPath: CLIENT_APP_PATH,
    isDevMode: process.env.NODE_ENV !== "production",
    requireSpaceAuth: createRequireSpaceAuth(spaceJwtTokenSigner, prismaSpaceParticipantRepository),
    spaceRepository: prismaSpaceRepository,
    spaceParticipantRepository: prismaSpaceParticipantRepository,
    spaceMagicLinkTokenRepository: prismaSpaceMagicLinkTokenRepository,
    spaceLocationRepository: prismaSpaceLocationRepository,
    spaceInviteRepository: prismaSpaceInviteRepository,
    spaceTokenSigner: spaceJwtTokenSigner,
    inviteTokenTtlMs: INVITE_TOKEN_TTL_MS,
    inviteRateLimitWindowMs: INVITE_RATE_LIMIT_WINDOW_MS,
    inviteRateLimitMax: INVITE_RATE_LIMIT_MAX,
    inviteMaxPerParticipant: INVITE_MAX_PER_PARTICIPANT,
    eventEndAt: EVENT_END_AT,
  };
}
