"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";
import { ADMIN_NAV_LINKS } from "@/components/admin/nav-links";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { cn } from "@/lib/utils";

/**
 * Mobile admin navigation. A slide-over drawer (from the start edge — left in
 * LTR, right in RTL) holding every destination the desktop sidebar has, plus
 * View Website, the language toggle, and Sign Out. Radix Dialog gives focus
 * trap + escape + scroll lock for free.
 */
export function MobileNavDrawer() {
  const { t, dir } = useAdminI18n();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Close on client-side navigation.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={t("nav.openMenu")}
          className="rounded-xl p-2 text-foreground/70 transition-colors hover:bg-brand-50/70 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
        >
          <Menu className="h-5 w-5" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 start-0 z-50 flex w-[82%] max-w-xs flex-col border-e border-border/80 bg-white/95 p-4 shadow-glow backdrop-blur-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
            dir === "rtl"
              ? "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right"
              : "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
          )}
        >
          <Dialog.Title className="sr-only">{t("nav.menu")}</Dialog.Title>

          <div className="flex items-center justify-between px-2 py-1">
            <Link href="/admin" className="flex items-center gap-2">
              <Logo className="h-8" withWordmark />
            </Link>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={t("nav.closeMenu")}
                className="rounded-xl p-2 text-foreground/60 transition-colors hover:bg-brand-50/70 hover:text-brand-800"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-1">
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
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-800 shadow-inner-glow"
                      : "text-foreground/70 hover:bg-brand-50/60 hover:text-brand-800",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-brand-700" : "text-brand-500/70",
                    )}
                  />
                  {t(l.key)}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2 border-t border-border pt-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-brand-50/60 hover:text-brand-800"
            >
              <ExternalLink className="h-4 w-4 text-brand-500/70" />
              {t("nav.viewWebsite")}
            </Link>

            <div className="flex items-center justify-between gap-2 px-1 pt-1">
              <AdminLanguageToggle />
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signOut")}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
