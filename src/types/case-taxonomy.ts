export interface CaseTypeOptionDTO {
  id: string;
  category: string;
  name: string;
  isActive: boolean;
  order: number;
  inUseCount: number;
}

export interface CaseCategoryConfigDTO {
  category: string;
  labelEn: string;
  labelAr: string;
  order: number;
  inUseCount: number;
  caseTypes: CaseTypeOptionDTO[];
}

export interface CaseTaxonomyDTO {
  categories: CaseCategoryConfigDTO[];
}
