import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Operator tool (TASK.md section 3): "deletes all locations, participants,
// invites, sessions, tokens, and consent records for a space, prints counts."
// Consent (consentAt/noticeVersion) lives directly on SpaceParticipant, so
// deleting the participant deletes the consent record with it - there's no
// separate consent table to also target.
//
//   pnpm purge:space -- --slug meckenhausen --yes
//
// Requires --yes (not just being run at all) since this is irreversible and
// there's no confirmation prompt in a non-interactive CI/cron context.
function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "(no DATABASE_URL)";
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

async function main() {
  const slug = argValue("--slug") ?? process.env.SPACE_SLUG;
  const confirmed = process.argv.includes("--yes");

  if (!slug) {
    throw new Error("Pass --slug <space-slug> (or set SPACE_SLUG)");
  }

  const space = await prisma.space.findUnique({ where: { slug } });
  if (!space) {
    throw new Error(`No space with slug "${slug}"`);
  }

  const [locationCount, participantCount, inviteCount, tokenCount] = await Promise.all([
    prisma.spaceLocation.count({ where: { spaceId: space.id } }),
    prisma.spaceParticipant.count({ where: { spaceId: space.id } }),
    prisma.spaceInvite.count({ where: { spaceId: space.id } }),
    prisma.spaceMagicLinkToken.count({ where: { participant: { spaceId: space.id } } }),
  ]);

  console.log(`purge-space → ${dbHost()}`);
  console.log(`  space: ${space.name} (${space.slug}, ${space.id})`);
  console.log(`  will delete: ${locationCount} locations, ${participantCount} participants (incl. their consent`);
  console.log(`  records), ${inviteCount} invites, ${tokenCount} sign-in tokens/sessions`);

  if (!confirmed) {
    console.log("Dry run only - pass --yes to actually delete.");
    return;
  }

  await prisma.$transaction([
    prisma.spaceLocation.deleteMany({ where: { spaceId: space.id } }),
    prisma.spaceMagicLinkToken.deleteMany({ where: { participant: { spaceId: space.id } } }),
    prisma.spaceInvite.deleteMany({ where: { spaceId: space.id } }),
    prisma.spaceParticipant.deleteMany({ where: { spaceId: space.id } }),
  ]);

  console.log(
    `Deleted ${locationCount} locations, ${participantCount} participants, ${inviteCount} invites, ${tokenCount} tokens.`,
  );
  console.log(`The Space row itself ("${space.slug}") was left in place so the map can be reused next year.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
