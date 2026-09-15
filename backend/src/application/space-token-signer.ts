import type { SpaceSessionPayload } from "../domain/space/space.types.js";

// Mirrors application/token-signer.ts's TokenSigner shape exactly, but as a
// separate interface/implementation (see infrastructure/auth/space-jwt-token-signer.ts)
// signed with its own secret - a directory session and a Space session must
// never be interchangeable, even accidentally.
export interface SpaceTokenSigner {
  sign(payload: SpaceSessionPayload): string;
  verify(token: string): SpaceSessionPayload;
}
