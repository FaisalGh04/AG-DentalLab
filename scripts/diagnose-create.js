const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRawUnsafe(`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_name = 'patient_cases'
    order by ordinal_position
  `);

  console.log(JSON.stringify(columns, null, 2));

  await prisma.$transaction(async (tx) => {
    const existing = await tx.patientCase.findUnique({
      where: { trackingId: "AG-TEST22" },
      select: { id: true },
    });

    console.log("tracking lookup ok", existing);

    await tx.patientCase.create({
      data: {
        trackingId: "AG-TEST22",
        patientFirstName: "Test",
        patientLastName: "Rollback",
        patientFullNameNorm: "test rollback",
        doctorName: "Dr. Test",
        caseType: "Ivoclar Prime ZiR",
        category: "C_AND_B",
        currentStatus: "RECEIVED",
        estimatedCompletionDate: null,
        notes: null,
      },
    });

    throw new Error("ROLLBACK_OK");
  });
}

main()
  .catch((error) => {
    console.error(
      "DIAG_ERROR",
      error.code,
      error.message,
      error.meta ? JSON.stringify(error.meta) : "",
    );
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
