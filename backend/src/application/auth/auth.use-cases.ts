import type { Account } from "../../domain/account/account.types.js";
import type { Role } from "../../domain/shared/types.js";
import { hashToken, isTokenUsable, TOKEN_TTL_MS } from "../../domain/auth/magic-link.js";
import type { AccountRepository } from "../account/account.repository.js";
import type { MemberRepository } from "../member/member.repository.js";
import type { MagicLinkTokenRepository } from "../magic-link/magic-link-token.repository.js";
import type { Mailer } from "../mailer.js";
import type { TokenSigner } from "../token-signer.js";
import type { TokenGenerator } from "../token-generator.js";
import {
  AccountNotFoundError,
  DuplicateAccountError,
  MailDeliveryError,
  MemberAlreadyLinkedError,
  MemberNotFoundError,
} from "./auth.errors.js";

export interface RequestMagicLinkDeps {
  accountRepository: AccountRepository;
  magicLinkTokenRepository: MagicLinkTokenRepository;
  mailer: Mailer;
  tokenGenerator: TokenGenerator;
  clientOrigin: string;
  clientAppPath: string;
  // Outside production, hand the token back directly to let local dev skip the
  // "go find it in the console" step. Never do this in production. Deliberately
  // gated on NODE_ENV, unlike the mailer's own Resend-vs-console choice (see
  // infrastructure/mail/get-mailer.ts), since this is about what the *response
  // body* is allowed to contain, not which mail transport is used.
  isDevMode: boolean;
}

export function createRequestMagicLinkUseCase(deps: RequestMagicLinkDeps) {
  return async function requestMagicLink(email: string): Promise<{ message: string; devToken?: string }> {
    // Always respond the same way regardless of whether the account exists, so this
    // endpoint can't be used to enumerate registered emails.
    const message = "If that email has an account, a login link has been sent.";

    const account = await deps.accountRepository.findByEmail(email);
    if (!account) {
      // Server-side only - the HTTP response stays identical either way (see
      // `message` above) so this can't be used to enumerate registered emails.
      console.log(`[auth] magic-link request: no account found for ${email}`);
      return { message };
    }

    const token = deps.tokenGenerator.generate();
    await deps.magicLinkTokenRepository.create(account.id, hashToken(token), new Date(Date.now() + TOKEN_TTL_MS));
    const url = `${deps.clientOrigin}${deps.clientAppPath}?token=${token}`;

    try {
      await deps.mailer.sendMagicLink(email, url);
      console.log(`[auth] magic-link sent to ${email}`);
    } catch (err) {
      // Log the failure, not the link/token.
      console.error(`[mailer] failed to send magic-link email to ${email}:`, err);
      // Outside production, the devToken below is a full substitute for email
      // delivery, not an extra convenience on top of it - a real Resend failure
      // (e.g. the local sandbox key's own-address-only restriction, see
      // docs/RESEND_EMAIL_SETUP.md) shouldn't block login when that substitute
      // path exists. In production there is no substitute, so this must still
      // surface as a failure.
      if (!deps.isDevMode) {
        throw new MailDeliveryError("Couldn't send the login email. Please try again.");
      }
    }

    return { message, ...(deps.isDevMode ? { devToken: token } : {}) };
  };
}

export interface VerifyMagicLinkDeps {
  magicLinkTokenRepository: MagicLinkTokenRepository;
  tokenSigner: TokenSigner;
}

export function createVerifyMagicLinkUseCase(deps: VerifyMagicLinkDeps) {
  return async function verifyMagicLink(token: string): Promise<{ token: string; account: Account } | null> {
    const found = await deps.magicLinkTokenRepository.findByHash(hashToken(token));
    if (!found || !isTokenUsable(found.record, new Date())) {
      return null;
    }

    await deps.magicLinkTokenRepository.markUsed(found.record.id);
    const session = deps.tokenSigner.sign({
      accountId: found.account.id,
      email: found.account.email,
      role: found.account.role,
      memberId: found.account.memberId,
    });
    return { token: session, account: found.account };
  };
}

export interface InviteAccountDeps {
  accountRepository: AccountRepository;
  memberRepository: MemberRepository;
}

export interface InviteAccountInput {
  email: string;
  role: Role;
  memberId?: string;
}

export function createInviteAccountUseCase(deps: InviteAccountDeps) {
  return async function inviteAccount(input: InviteAccountInput): Promise<Account> {
    const existing = await deps.accountRepository.findByEmail(input.email);
    if (existing) {
      throw new DuplicateAccountError("An account with that email already exists");
    }

    if (input.memberId) {
      const member = await deps.memberRepository.findById(input.memberId);
      if (!member) {
        throw new MemberNotFoundError("Member not found");
      }
      const alreadyLinked = await deps.accountRepository.findByMemberId(input.memberId);
      if (alreadyLinked) {
        throw new MemberAlreadyLinkedError("That member is already linked to another account");
      }
    }

    return deps.accountRepository.create({
      email: input.email,
      role: input.role,
      memberId: input.memberId ?? null,
    });
  };
}

export interface UpdateAccountDeps {
  accountRepository: AccountRepository;
  memberRepository: MemberRepository;
}

export interface UpdateAccountInput {
  accountId: string;
  role: Role;
  // undefined = leave the current link alone; null = unlink; a string = link to
  // that member (replacing any current link).
  memberId?: string | null;
}

export function createUpdateAccountUseCase(deps: UpdateAccountDeps) {
  return async function updateAccount(input: UpdateAccountInput, actorAccountId: string): Promise<Account> {
    const existing = await deps.accountRepository.findById(input.accountId);
    if (!existing) {
      throw new AccountNotFoundError("Account not found");
    }

    const memberId = input.memberId === undefined ? existing.memberId : input.memberId;
    if (memberId) {
      const member = await deps.memberRepository.findById(memberId);
      if (!member) {
        throw new MemberNotFoundError("Member not found");
      }
      const alreadyLinked = await deps.accountRepository.findByMemberId(memberId);
      if (alreadyLinked && alreadyLinked.id !== existing.id) {
        throw new MemberAlreadyLinkedError("That member is already linked to another account");
      }
    }

    const updated = await deps.accountRepository.update(input.accountId, { role: input.role, memberId }, actorAccountId);
    if (!updated) {
      throw new AccountNotFoundError("Account not found");
    }
    return updated;
  };
}
