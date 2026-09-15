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
import { prismaEventRepository } from "./infrastructure/prisma/event.repository.js";
import { prismaEntryRepository } from "./infrastructure/prisma/entry.repository.js";
import { spaceJwtTokenSigner } from "./infrastructure/auth/space-jwt-token-signer.js";

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";
// Must match vite.config.ts's `base` — the SPA is served from this subpath
// (a GitHub Pages project page), not from CLIENT_ORIGIN's root.
const CLIENT_APP_PATH = "/visual-directory";

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
    eventRepository: prismaEventRepository,
    entryRepository: prismaEntryRepository,
    spaceTokenSigner: spaceJwtTokenSigner,
  };
}
