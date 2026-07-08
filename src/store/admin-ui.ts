import { create } from "zustand";
import type { CaseCategory } from "@prisma/client";

/** Client-side UI state for the admin case list (filters, dialogs). */
interface AdminUIState {
  search: string;
  category: CaseCategory | "ALL";
  page: number;
  archived: boolean;

  setSearch: (v: string) => void;
  setCategory: (v: CaseCategory | "ALL") => void;
  setPage: (v: number) => void;
  setArchived: (v: boolean) => void;
  reset: () => void;
}

const initial = {
  search: "",
  category: "ALL" as const,
  page: 1,
  archived: false,
};

export const useAdminUI = create<AdminUIState>((set) => ({
  ...initial,
  setSearch: (search) => set({ search, page: 1 }),
  setCategory: (category) => set({ category, page: 1 }),
  setPage: (page) => set({ page }),
  setArchived: (archived) => set({ archived, page: 1 }),
  reset: () => set(initial),
}));
