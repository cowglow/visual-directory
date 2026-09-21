import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { CURRENT_NOTICE_VERSION } from "../src/application/space/space.use-cases.js";

const prisma = new PrismaClient();

// Bootstraps the one space this app serves and its first participant, who can
// then invite everyone else (TASK.md section 2: "NO public access" - there is
// no self-serve sign-up route any more, so *something* has to create the first
// participant out of band).
async function main() {
  const slug = process.env.SEED_SPACE_SLUG ?? "meckenhausen";
  const name = process.env.SEED_SPACE_NAME ?? "Meckenhausen Halloween";
  const email = process.env.SEED_SPACE_PARTICIPANT_EMAIL;
  if (!email) {
    throw new Error("SEED_SPACE_PARTICIPANT_EMAIL must be set to seed the first participant");
  }

  const space = await prisma.space.upsert({
    where: { slug },
    update: {},
    create: { slug, name },
  });

  const participant = await prisma.spaceParticipant.upsert({
    where: { spaceId_email: { spaceId: space.id, email } },
    update: {},
    create: {
      spaceId: space.id,
      email,
      role: "participant",
      consentAt: new Date(),
      noticeVersion: CURRENT_NOTICE_VERSION,
    },
  });

  console.log(`Seeded space: ${space.name} (${space.slug}, ${space.id})`);
  console.log(`Seeded participant: ${participant.email} (${participant.id})`);
  console.log(`They can sign in with POST /spaces/${space.slug}/magic-link and invite others from there.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
