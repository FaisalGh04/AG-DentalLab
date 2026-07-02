import { PrismaClient, CaseCategory, CaseStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

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
    const demo = await prisma.patientCase.create({
      data: {
        patientFirstName: "Sara",
        patientLastName: "Khalil",
        patientFullNameNorm: normalizeName("Sara", "Khalil"),
        doctorName: "Dr. Omar Haddad",
        caseType: "Zirconia Bridge (3 units)",
        category: CaseCategory.FIXED_RESTORATIONS,
        currentStatus: CaseStatus.PRODUCTION,
        estimatedCompletionDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        notes: "Shade A2. Deliver before the weekend if possible.",
        progress: {
          create: [
            { stepTitle: "Digital Scan Completed", completed: true, order: 1 },
            { stepTitle: "Design Started", completed: true, order: 2 },
            { stepTitle: "Design Approved", completed: true, order: 3 },
            { stepTitle: "Milling Started", completed: true, order: 4 },
            { stepTitle: "Zirconia Production", completed: false, order: 5 },
            { stepTitle: "Ceramic Layering", completed: false, order: 6 },
            { stepTitle: "Quality Check", completed: false, order: 7 },
            { stepTitle: "Final Polishing", completed: false, order: 8 },
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
