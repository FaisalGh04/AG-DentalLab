import type { CaseCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CaseTaxonomyDTO } from "@/types/case-taxonomy";

export async function getCaseTaxonomy(): Promise<CaseTaxonomyDTO> {
  const [categories, usage] = await Promise.all([
    prisma.caseCategoryConfig.findMany({
      orderBy: [{ order: "asc" }, { category: "asc" }],
      include: {
        caseTypes: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      },
    }),
    prisma.patientCase.groupBy({
      by: ["category", "caseType"],
      _count: { _all: true },
    }),
  ]);

  const counts = new Map(
    usage.map((row) => [
      usageKey(row.category, row.caseType),
      row._count._all,
    ]),
  );

  return {
    categories: categories.map((category) => ({
      category: category.category,
      labelEn: category.labelEn,
      labelAr: category.labelAr,
      order: category.order,
      caseTypes: category.caseTypes.map((type) => ({
        id: type.id,
        category: type.category,
        name: type.name,
        isActive: type.isActive,
        order: type.order,
        inUseCount: counts.get(usageKey(type.category, type.name)) ?? 0,
      })),
    })),
  };
}

export async function isActiveCaseType(
  category: CaseCategory,
  name: string,
): Promise<boolean> {
  const option = await prisma.caseTypeOption.findUnique({
    where: { category_name: { category, name } },
    select: { isActive: true },
  });
  return option?.isActive === true;
}

export async function caseTypeInUseCount(
  category: CaseCategory,
  name: string,
): Promise<number> {
  return prisma.patientCase.count({ where: { category, caseType: name } });
}

function usageKey(category: CaseCategory, name: string): string {
  return `${category}::${name}`;
}
