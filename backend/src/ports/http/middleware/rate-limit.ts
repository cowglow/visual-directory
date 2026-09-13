import rateLimit from "express-rate-limit";

// /auth/magic-link sends a real email per request - without a limit, one IP can
// spam an arbitrary inbox with sign-in links or burn through the Resend quota.
// Keyed by IP rather than the submitted email, since the email itself isn't
// authenticated yet at this point in the flow.
export const magicLinkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
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
