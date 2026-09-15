import rateLimit from "express-rate-limit";

// /auth/magic-link sends a real email per request - without a limit, one IP can
// spam an arbitrary inbox with sign-in links or burn through the Resend quota.
// Keyed by IP rather than the submitted email, since the email itself isn't
// authenticated yet at this point in the flow. 20, not something tighter like 5:
// this is a shared-IP app (a handful of people behind one office/home NAT can all
// be signing in around the same time) and the e2e suite alone calls loginAs 11
// times in one run - a limit that fails legitimate concurrent use isn't a
// security win, it's just a worse outage than the abuse it's meant to stop.
export const magicLinkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login link requests. Please wait a few minutes and try again." },
});

// /auth/verify tokens are 256 bits of random data (see
// infrastructure/auth/token-generator.ts), so guessing one is infeasible
// regardless of rate limiting - this exists to slow and surface repeated
// attempts rather than to make brute force merely difficult.
export const verifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

// Same shape and reasoning as magicLinkRateLimiter above, kept as its own
// instance (own counters) since it's a different route on a different trust
// boundary (Space participants, not directory accounts).
export const spaceMagicLinkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login link requests. Please wait a few minutes and try again." },
});
