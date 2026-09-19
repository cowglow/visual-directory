import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequestMagicLinkUseCase, type RequestMagicLinkDeps } from "./auth.use-cases.js";
import type { Account } from "../../domain/account/account.types.js";

const account: Account = {
  id: "acc-1",
  email: "cowglow+foo@gmail.com",
  role: "leader",
  memberId: null,
};

function makeDeps(overrides: Partial<RequestMagicLinkDeps> = {}): RequestMagicLinkDeps {
  return {
    accountRepository: {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(account),
      findByMemberId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    magicLinkTokenRepository: {
      create: vi.fn().mockResolvedValue(undefined),
      findByHash: vi.fn(),
      markUsed: vi.fn(),
    },
    mailer: {
      sendMagicLink: vi.fn().mockResolvedValue(undefined),
    },
    tokenGenerator: {
      generate: vi.fn().mockReturnValue("test-token"),
    },
    clientOrigin: "https://example.com",
    clientAppPath: "/login",
    isDevMode: false,
    ...overrides,
  };
}

describe("requestMagicLink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs that no account was found and never calls the mailer, while still returning the generic message", async () => {
    const deps = makeDeps({
      accountRepository: {
        findAll: vi.fn(),
        findById: vi.fn(),
        findByEmail: vi.fn().mockResolvedValue(null),
        findByMemberId: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const requestMagicLink = createRequestMagicLinkUseCase(deps);

    const result = await requestMagicLink("nobody@example.com");

    expect(result.message).toBe("If that email has an account, a login link has been sent.");
    expect(deps.mailer.sendMagicLink).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("no account found for nobody@example.com"));
  });

  it("logs a confirmed send once the mailer succeeds", async () => {
    const deps = makeDeps();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const requestMagicLink = createRequestMagicLinkUseCase(deps);

    await requestMagicLink(account.email);

    expect(deps.mailer.sendMagicLink).toHaveBeenCalledWith(account.email, expect.stringContaining("https://example.com/login?token="));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`magic-link sent to ${account.email}`));
  });
});
