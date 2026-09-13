import jwt from "jsonwebtoken";
import type { SessionPayload, TokenSigner } from "../../application/token-signer.js";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set");
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();

export const jwtTokenSigner: TokenSigner = {
  sign(payload: SessionPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7h" });
  },
  verify(token: string): SessionPayload {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  },
};
