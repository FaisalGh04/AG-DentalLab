/** A portfolio photo as returned to the admin client. */
export interface PortfolioImageDTO {
  id: string;
  /** Same-origin URL to render (static /public path or the public serve route). */
  url: string;
  width: number;
  height: number;
  order: number;
}

/** A portfolio item (one showcased case) as returned to the admin client. */
export interface PortfolioItemDTO {
  id: string;
  // DB-backed folder link (the value the UI groups/filters by).
  folderId: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  order: number;
  createdAt: string;
  images: PortfolioImageDTO[];
}

export interface PortfolioListResponse {
  items: PortfolioItemDTO[];
}

/** A DB-backed folder as returned to the admin client (form dropdown + filter). */
export interface FolderDTO {
  id: string;
  labelEn: string;
  labelAr: string;
  order: number;
}

export interface FolderListResponse {
  folders: FolderDTO[];
}

/**
 * One folder as rendered by the public "Our Work" section: the DB-backed folder
 * (id + bilingual labels, picked by locale client-side) and the items it
 * contains (empty for folders with no cases yet). Every folder is represented,
 * in display order — see getPortfolioFolders().
 */
export interface PortfolioFolderView {
  id: string;
  labelEn: string;
  labelAr: string;
  items: PortfolioItemDTO[];
}
