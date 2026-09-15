import jwt from "jsonwebtoken";
import type { SpaceSessionPayload } from "../../domain/space/space.types.js";
import type { SpaceTokenSigner } from "../../application/space-token-signer.js";

function getSpaceJwtSecret(): string {
  const secret = process.env.SPACE_JWT_SECRET;
  if (!secret) {
    throw new Error("SPACE_JWT_SECRET must be set");
  }
  return secret;
}

const SPACE_JWT_SECRET = getSpaceJwtSecret();

export const spaceJwtTokenSigner: SpaceTokenSigner = {
  sign(payload: SpaceSessionPayload): string {
    // Longer-lived than the directory's 7h session: a Space holds no address
    // book or contact info the way the member directory does, so the
    // trade-off between session length and blast radius sits differently -
    // favor a neighbor not having to re-request a link mid-event.
    return jwt.sign(payload, SPACE_JWT_SECRET, { expiresIn: "7d" });
  },
  verify(token: string): SpaceSessionPayload {
    const payload = jwt.verify(token, SPACE_JWT_SECRET) as Partial<SpaceSessionPayload>;
    // Defense in depth beyond the separate secret: a token must actually carry
    // this scope and shape before anything trusts it as a space session. See
    // application/space-token-signer.ts's comment on why the payload shapes
    // deliberately don't overlap with the directory's SessionPayload.
    if (payload.scope !== "space" || typeof payload.participantId !== "string" || typeof payload.spaceId !== "string") {
      throw new Error("Not a valid space session token");
    }
    return payload as SpaceSessionPayload;
  },
};
