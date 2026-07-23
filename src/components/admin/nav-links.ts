import {
  LayoutDashboard,
  FolderKanban,
  Archive,
  Images,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavLink {
  href: string;
  /** admin-i18n dot-path resolved at render time */
  key: string;
  icon: LucideIcon;
  /** only "active" on an exact pathname match (the dashboard) */
  exact?: boolean;
}

/**
 * Admin navigation destinations, shared by the desktop Sidebar and the mobile
 * nav drawer so both stay in sync.
 */
export const ADMIN_NAV_LINKS: readonly AdminNavLink[] = [
  { href: "/admin", key: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/cases", key: "nav.cases", icon: FolderKanban },
  { href: "/admin/cases?archived=true", key: "nav.archive", icon: Archive },
  { href: "/admin/case-groups", key: "nav.caseGroups", icon: Workflow },
  { href: "/admin/portfolio", key: "nav.portfolio", icon: Images },
];
