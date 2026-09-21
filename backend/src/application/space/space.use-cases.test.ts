import { describe, expect, test, vi } from "vitest";
import type { SpaceInvite, SpaceLocation, SpaceParticipant, SpaceRole } from "../../domain/space/space.types.js";
import { hashToken } from "../../domain/auth/magic-link.js";
import type { Mailer } from "../mailer.js";
import type { TokenGenerator } from "../token-generator.js";
import type { SpaceTokenSigner } from "../space-token-signer.js";
import type {
  SpaceInviteRepository,
  SpaceLocationRepository,
  SpaceParticipantRepository,
} from "./space.repository.js";
import {
  createAcceptInviteUseCase,
  createAddLocationUseCase,
  createDeleteLocationUseCase,
  createInviteParticipantUseCase,
  createRevokeInviteUseCase,
  createUpdateLocationUseCase,
} from "./space.use-cases.js";
import {
  AlreadyParticipantError,
  ConsentRequiredError,
  InviteAlreadyUsedError,
  InviteCapExceededError,
  InviteExpiredError,
  InviteNotFoundError,
  InviteOwnershipError,
  InviteRateLimitError,
  InviteRevokedError,
  LocationAlreadyExistsError,
  LocationNotFoundError,
  LocationOwnershipError,
  RoleEscalationError,
} from "./space.errors.js";

const SPACE = { id: "space-1", slug: "meckenhausen", name: "Meckenhausen Halloween", createdAt: new Date().toISOString() };

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function makeParticipant(role: SpaceRole, overrides: Partial<SpaceParticipant> = {}): SpaceParticipant {
  return {
    id: nextId("participant"),
    spaceId: SPACE.id,
    email: overrides.email ?? `${role}@example.com`,
    role,
    consentAt: new Date().toISOString(),
    noticeVersion: "2026-09-21",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

class FakeParticipantRepository implements SpaceParticipantRepository {
  byId = new Map<string, SpaceParticipant>();

  seed(participant: SpaceParticipant) {
    this.byId.set(participant.id, participant);
    return participant;
  }

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }

  async findByEmail(spaceId: string, email: string) {
    return [...this.byId.values()].find((p) => p.spaceId === spaceId && p.email === email) ?? null;
  }

  async create(input: { spaceId: string; email: string; role: SpaceRole; consentAt: Date; noticeVersion: string }) {
    const participant: SpaceParticipant = {
      id: nextId("participant"),
      spaceId: input.spaceId,
      email: input.email,
      role: input.role,
      consentAt: input.consentAt.toISOString(),
      noticeVersion: input.noticeVersion,
      createdAt: new Date().toISOString(),
    };
    this.byId.set(participant.id, participant);
    return participant;
  }

  async deleteCascade(id: string) {
    this.byId.delete(id);
  }
}

class FakeLocationRepository implements SpaceLocationRepository {
  byId = new Map<string, SpaceLocation>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }

  async findByParticipant(participantId: string) {
    return [...this.byId.values()].find((l) => l.participantId === participantId) ?? null;
  }

  async findAllBySpace(spaceId: string) {
    return [...this.byId.values()].filter((l) => l.spaceId === spaceId);
  }

  async create(input: { spaceId: string; participantId: string; label: string; note: string; lat: number; lng: number }) {
    const location: SpaceLocation = {
      id: nextId("location"),
      spaceId: input.spaceId,
      participantId: input.participantId,
      label: input.label,
      note: input.note,
      lat: input.lat,
      lng: input.lng,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.byId.set(location.id, location);
    return location;
  }

  async update(id: string, input: { label: string; note: string; lat: number; lng: number }) {
    const existing = this.byId.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...input, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    return this.byId.delete(id);
  }
}

class FakeInviteRepository implements SpaceInviteRepository {
  byId = new Map<string, SpaceInvite>();

  seed(invite: SpaceInvite) {
    this.byId.set(invite.id, invite);
    return invite;
  }

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }

  async findByTokenHash(tokenHash: string) {
    return [...this.byId.values()].find((i) => i.tokenHash === tokenHash) ?? null;
  }

  async create(input: {
    spaceId: string;
    email: string;
    role: SpaceRole;
    tokenHash: string;
    inviterParticipantId: string;
    expiresAt: Date;
  }) {
    const invite: SpaceInvite = {
      id: nextId("invite"),
      spaceId: input.spaceId,
      email: input.email,
      role: input.role,
      tokenHash: input.tokenHash,
      inviterParticipantId: input.inviterParticipantId,
      expiresAt: input.expiresAt.toISOString(),
      usedAt: null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.byId.set(invite.id, invite);
    return invite;
  }

  async markUsed(id: string) {
    const invite = this.byId.get(id);
    if (invite) invite.usedAt = new Date().toISOString();
  }

  async revoke(id: string) {
    const invite = this.byId.get(id);
    if (invite) invite.revokedAt = new Date().toISOString();
  }

  async countByInviter(inviterParticipantId: string, since?: Date) {
    return [...this.byId.values()].filter(
      (i) => i.inviterParticipantId === inviterParticipantId && (!since || new Date(i.createdAt) >= since),
    ).length;
  }
}

function fakeMailer(): Mailer {
  return { sendMagicLink: vi.fn().mockResolvedValue(undefined) };
}

function fakeTokenGenerator(): TokenGenerator {
  let n = 0;
  return {
    generate: () => {
      n += 1;
      return `token-${n}`;
    },
  };
}

function fakeSpaceTokenSigner(): SpaceTokenSigner {
  return {
    sign: (payload) => JSON.stringify(payload),
    verify: (token) => JSON.parse(token),
  };
}

function inviteDeps(overrides: Partial<Parameters<typeof createInviteParticipantUseCase>[0]> = {}) {
  return {
    spaceParticipantRepository: new FakeParticipantRepository(),
    spaceInviteRepository: new FakeInviteRepository(),
    mailer: fakeMailer(),
    tokenGenerator: fakeTokenGenerator(),
    clientOrigin: "https://example.test",
    clientAppPath: "/visual-directory",
    isDevMode: true,
    inviteTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
    inviteRateLimitWindowMs: 60 * 60 * 1000,
    inviteRateLimitMax: 10,
    inviteMaxPerParticipant: 50,
    ...overrides,
  };
}

describe("inviteParticipant", () => {
  test("a visitor cannot invite anyone (no role escalation path)", async () => {
    const deps = inviteDeps();
    const invite = createInviteParticipantUseCase(deps);
    const visitor = deps.spaceParticipantRepository.seed(makeParticipant("visitor"));

    await expect(invite(SPACE, visitor, { email: "new@example.com", role: "visitor" })).rejects.toBeInstanceOf(
      RoleEscalationError,
    );
  });

  test("a participant can invite a visitor or another participant", async () => {
    const deps = inviteDeps();
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    const result = await invite(SPACE, participant, { email: "new@example.com", role: "participant" });

    expect(result.devToken).toBeDefined();
    expect(deps.mailer.sendMagicLink).toHaveBeenCalledWith("new@example.com", expect.stringContaining("/invite?token="));
  });

  test("inviting an email that's already a participant is a silent no-op (anti-enumeration)", async () => {
    const deps = inviteDeps();
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));
    deps.spaceParticipantRepository.seed(makeParticipant("visitor", { email: "already@example.com" }));

    const result = await invite(SPACE, participant, { email: "already@example.com", role: "visitor" });

    expect(result.message).toBe("If that invite can be sent, it has been.");
    expect(deps.mailer.sendMagicLink).not.toHaveBeenCalled();
  });

  test("rate limit: too many invites within the window is rejected", async () => {
    const deps = inviteDeps({ inviteRateLimitMax: 1 });
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await invite(SPACE, participant, { email: "one@example.com", role: "visitor" });
    await expect(invite(SPACE, participant, { email: "two@example.com", role: "visitor" })).rejects.toBeInstanceOf(
      InviteRateLimitError,
    );
  });

  test("lifetime cap: too many invites ever sent is rejected even outside the rate window", async () => {
    const deps = inviteDeps({ inviteRateLimitMax: 100, inviteMaxPerParticipant: 1 });
    const invite = createInviteParticipantUseCase(deps);
    const participant = deps.spaceParticipantRepository.seed(makeParticipant("participant"));

    await invite(SPACE, participant, { email: "one@example.com", role: "visitor" });
    await expect(invite(SPACE, participant, { email: "two@example.com", role: "visitor" })).rejects.toBeInstanceOf(
      InviteCapExceededError,
    );
  });
});

describe("acceptInvite / revokeInvite", () => {
  function acceptDeps() {
    const spaceParticipantRepository = new FakeParticipantRepository();
    const spaceInviteRepository = new FakeInviteRepository();
    const spaceTokenSigner = fakeSpaceTokenSigner();
    return { spaceParticipantRepository, spaceInviteRepository, spaceTokenSigner };
  }

  function seedInvite(repo: FakeInviteRepository, token: string, overrides: Partial<SpaceInvite> = {}) {
    return repo.seed({
      id: nextId("invite"),
      spaceId: SPACE.id,
      email: "invitee@example.com",
      role: "visitor",
      tokenHash: hashToken(token),
      inviterParticipantId: "inviter-1",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
      ...overrides,
    });
  }

  test("accepting creates a participant with the invited role and marks the invite used", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "good-token", { role: "participant" });

    const result = await accept(SPACE, "good-token", true);

    expect(result.participant.role).toBe("participant");
    expect(result.participant.email).toBe("invitee@example.com");
    const stored = await deps.spaceParticipantRepository.findByEmail(SPACE.id, "invitee@example.com");
    expect(stored).not.toBeNull();
  });

  test("consent is required to accept", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "good-token");

    await expect(accept(SPACE, "good-token", false)).rejects.toBeInstanceOf(ConsentRequiredError);
  });

  test("an unknown token is rejected", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);

    await expect(accept(SPACE, "no-such-token", true)).rejects.toBeInstanceOf(InviteNotFoundError);
  });

  test("an expired invite is rejected", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "expired-token", { expiresAt: new Date(Date.now() - 1000).toISOString() });

    await expect(accept(SPACE, "expired-token", true)).rejects.toBeInstanceOf(InviteExpiredError);
  });

  test("a revoked invite is rejected", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "revoked-token", { revokedAt: new Date().toISOString() });

    await expect(accept(SPACE, "revoked-token", true)).rejects.toBeInstanceOf(InviteRevokedError);
  });

  test("an already-used invite cannot be accepted twice", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "used-token", { usedAt: new Date().toISOString() });

    await expect(accept(SPACE, "used-token", true)).rejects.toBeInstanceOf(InviteAlreadyUsedError);
  });

  test("cannot accept if the email is already a participant (race with another invite)", async () => {
    const deps = acceptDeps();
    const accept = createAcceptInviteUseCase(deps);
    seedInvite(deps.spaceInviteRepository, "good-token");
    await deps.spaceParticipantRepository.create({
      spaceId: SPACE.id,
      email: "invitee@example.com",
      role: "visitor",
      consentAt: new Date(),
      noticeVersion: "2026-09-21",
    });

    await expect(accept(SPACE, "good-token", true)).rejects.toBeInstanceOf(AlreadyParticipantError);
  });

  test("only the inviter can revoke their invite", async () => {
    const spaceInviteRepository = new FakeInviteRepository();
    const revoke = createRevokeInviteUseCase({ spaceInviteRepository });
    const invite = seedInvite(spaceInviteRepository, "some-token", { inviterParticipantId: "inviter-1" });

    await expect(revoke(invite.id, "someone-else")).rejects.toBeInstanceOf(InviteOwnershipError);
    await expect(revoke(invite.id, "inviter-1")).resolves.toBeUndefined();
  });

  test("an already-accepted invite cannot be revoked", async () => {
    const spaceInviteRepository = new FakeInviteRepository();
    const revoke = createRevokeInviteUseCase({ spaceInviteRepository });
    const invite = seedInvite(spaceInviteRepository, "some-token", {
      inviterParticipantId: "inviter-1",
      usedAt: new Date().toISOString(),
    });

    await expect(revoke(invite.id, "inviter-1")).rejects.toBeInstanceOf(InviteAlreadyUsedError);
  });
});

describe("location ownership", () => {
  const validInput = { label: "Cage Family", note: "Ring the bell", lat: 49.17, lng: 11.29 };

  test("only a participant role can place a pin, not a visitor", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const addLocation = createAddLocationUseCase({ spaceLocationRepository });
    const visitor = makeParticipant("visitor");

    await expect(addLocation(visitor, validInput)).rejects.toBeInstanceOf(LocationOwnershipError);
  });

  test("a participant can only ever have one pin", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const addLocation = createAddLocationUseCase({ spaceLocationRepository });
    const participant = makeParticipant("participant");

    await addLocation(participant, validInput);
    await expect(addLocation(participant, validInput)).rejects.toBeInstanceOf(LocationAlreadyExistsError);
  });

  test("a participant can only edit their own pin", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const addLocation = createAddLocationUseCase({ spaceLocationRepository });
    const updateLocation = createUpdateLocationUseCase({ spaceLocationRepository });
    const owner = makeParticipant("participant");
    const stranger = makeParticipant("participant");

    const location = await addLocation(owner, validInput);

    await expect(updateLocation(stranger, location.id, { ...validInput, label: "Hacked" })).rejects.toBeInstanceOf(
      LocationOwnershipError,
    );
    await expect(updateLocation(owner, location.id, { ...validInput, label: "New label" })).resolves.toMatchObject({
      label: "New label",
    });
  });

  test("a participant can only delete their own pin", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const addLocation = createAddLocationUseCase({ spaceLocationRepository });
    const deleteLocation = createDeleteLocationUseCase({ spaceLocationRepository });
    const owner = makeParticipant("participant");
    const stranger = makeParticipant("participant");

    const location = await addLocation(owner, validInput);

    await expect(deleteLocation(stranger, location.id)).rejects.toBeInstanceOf(LocationOwnershipError);
    await expect(deleteLocation(owner, location.id)).resolves.toBeUndefined();
  });

  test("editing a pin that doesn't exist raises not-found", async () => {
    const spaceLocationRepository = new FakeLocationRepository();
    const updateLocation = createUpdateLocationUseCase({ spaceLocationRepository });
    const owner = makeParticipant("participant");

    await expect(updateLocation(owner, "no-such-id", validInput)).rejects.toBeInstanceOf(LocationNotFoundError);
  });
});
