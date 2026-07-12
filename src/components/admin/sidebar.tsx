"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, ExternalLink, ChevronsUpDown } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";
import { ADMIN_NAV_LINKS } from "@/components/admin/nav-links";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { cn } from "@/lib/utils";

export function Sidebar({ adminName }: { adminName: string }) {
  const { t } = useAdminI18n();
  const pathname = usePathname();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-border/80 bg-white/[0.72] p-4 shadow-soft backdrop-blur-xl lg:flex">
      <Link href="/admin" className="flex items-center gap-2 px-2 py-3">
        <Logo className="h-9" withWordmark />
      </Link>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {ADMIN_NAV_LINKS.map((l) => {
          const Icon = l.icon;
          const base = l.href.split("?")[0];
          const active = l.exact
            ? pathname === l.href
            : pathname.startsWith(base ?? l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-50 text-brand-800 shadow-inner-glow"
                  : "text-foreground/65 hover:bg-brand-50/60 hover:text-brand-800",
              )}
            >
              {active && (
                <span className="absolute start-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-e-full bg-brand-600" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active
                    ? "text-brand-700"
                    : "text-brand-500/70 group-hover:text-brand-700",
                )}
              />
              {t(l.key)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-border pt-4">
        <AdminLanguageToggle className="w-full justify-center" />

        <Link
          href="/"
          target="_blank"
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/65 transition-colors hover:bg-brand-50/60 hover:text-brand-800"
        >
          <ExternalLink className="h-4 w-4 text-brand-500/70 transition-colors group-hover:text-brand-700" />{" "}
          {t("nav.viewWebsite")}
        </Link>

        {/* Combined account element: whole row is the dropdown trigger. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl border border-border/80 bg-white/70 px-3 py-2.5 text-start shadow-inner-glow transition-colors hover:bg-brand-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 data-[state=open]:bg-brand-50/70"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-100 bg-brand-50">
                <Image
                  src="/ag-logo-without-text.png"
                  alt="AG Dental Lab"
                  width={72}
                  height={72}
                  className="h-6 w-6 object-contain"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {t("nav.signedInAs")}
                </p>
                <p className="truncate text-sm font-semibold text-ink">
                  {adminName}
                </p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <LogOut className="h-4 w-4" /> {t("nav.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("nav.signOutConfirmTitle")}
        description={t("nav.signOutConfirmBody")}
        confirmLabel={t("nav.signOut")}
        destructive
        onConfirm={() => {
          setConfirmOpen(false);
          signOut({ callbackUrl: "/login" });
        }}
      />
    </aside>
  );
}
