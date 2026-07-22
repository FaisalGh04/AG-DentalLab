import { PrismaClient, CaseCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateUniqueTrackingId } from "../src/lib/tracking-id";
import {
  computeIsCompleted,
  PRODUCTION_COLLECTIONS,
} from "../src/lib/production-templates";

const prisma = new PrismaClient();

function normalizeName(first: string, last: string) {
  return `${first} ${last}`.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "owner@agdentallab.com";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  // --- Seed the single admin -------------------------------------
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: "Abdullatif Ghatasheh" },
  });
  console.log(`✔ Admin ready: ${email}`);

  // --- Seed a demo case with progress (idempotent-ish) -----------
  const existing = await prisma.patientCase.findFirst({
    where: { patientFullNameNorm: normalizeName("Sara", "Khalil") },
  });

  if (!existing) {
    // Demo case mid-way through the "Zirconia Crown & Bridge" collection.
    const collectionId = "zirconia-crown-bridge";
    const currentStageId = "cad-cam";
    const hiddenStageIds: string[] = [];
    const demo = await prisma.patientCase.create({
      data: {
        patientFirstName: "Sara",
        trackingId: await generateUniqueTrackingId(),
        patientLastName: "Khalil",
        patientFullNameNorm: normalizeName("Sara", "Khalil"),
        doctorName: "Dr. Omar Haddad",
        caseType: "Ivoclar Prime ZiR",
        category: CaseCategory.C_AND_B,
        collectionId,
        currentStageId,
        hiddenStageIds,
        isCompleted: computeIsCompleted(
          PRODUCTION_COLLECTIONS,
          collectionId,
          currentStageId,
          hiddenStageIds,
        ),
        estimatedCompletionDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        notes: "Shade A2. Deliver before the weekend if possible.",
        progress: {
          // Each step is tagged with the stage it belongs to, so the case detail
          // + public tracker scope steps per stage.
          create: [
            {
              stepTitle: "Received / الاستلام",
              stageId: "received",
              completed: true,
              order: 1,
            },
            {
              stepTitle: "Cast impression (type4) / صب القياس (type4)",
              stageId: "casting-prep",
              completed: true,
              order: 2,
            },
            {
              stepTitle: "CAD design + try-in / مرحلة التصميم (CAD) + بروفا",
              stageId: "cad-cam",
              completed: false,
              order: 3,
            },
          ],
        },
      },
    });
    console.log(`✔ Demo case created: ${demo.id}`);
  } else {
    console.log("✔ Demo case already present");
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
