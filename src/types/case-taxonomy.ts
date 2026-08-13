import type { CaseCategory } from "@prisma/client";

export interface CaseTypeOptionDTO {
  id: string;
  category: CaseCategory;
  name: string;
  isActive: boolean;
  order: number;
  inUseCount: number;
}

export interface CaseCategoryConfigDTO {
  category: CaseCategory;
  labelEn: string;
  labelAr: string;
  order: number;
  caseTypes: CaseTypeOptionDTO[];
}

export interface CaseTaxonomyDTO {
  categories: CaseCategoryConfigDTO[];
}
