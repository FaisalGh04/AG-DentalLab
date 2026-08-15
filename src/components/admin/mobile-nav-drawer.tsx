"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X, ExternalLink, Settings } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";
import { AdminThemeToggle } from "@/components/admin/admin-theme";
import { ADMIN_NAV_LINKS } from "@/components/admin/nav-links";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { cn } from "@/lib/utils";
import { AdminSettingsDialog } from "@/components/admin/admin-settings-dialog";

/**
 * Mobile admin navigation. A slide-over drawer (from the start edge — left in
 * LTR, right in RTL) holding every destination the desktop sidebar has, plus
 * View Website, the language toggle, and Settings. Radix Dialog gives focus
 * trap + escape + scroll lock for free.
 */
export function MobileNavDrawer({ adminName }: { adminName: string }) {
  const { t, dir } = useAdminI18n();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Close on client-side navigation.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
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
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
          className={cn(
            "fixed inset-y-0 start-0 z-50 flex w-[82%] max-w-xs flex-col overflow-hidden border-e border-border/80 bg-white/95 p-4 shadow-glow backdrop-blur-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
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

          <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
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

          <div className="mt-auto shrink-0 space-y-2 border-t border-border pt-4">
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-brand-50/60 hover:text-brand-800"
            >
              <ExternalLink className="h-4 w-4 text-brand-500/70" />
              {t("nav.viewWebsite")}
            </Link>

            <AdminThemeToggle className="w-full" />
            <AdminLanguageToggle className="w-full justify-center" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-border/80 bg-white/80 px-3 py-2.5 text-start shadow-inner-glow transition-colors hover:bg-brand-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-100 bg-white shadow-inner-glow">
                <Image
                  src="/ag-logo-without-text.png"
                  alt="AG Dental Lab"
                  width={72}
                  height={72}
                  className="h-9 w-9 object-contain"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">
                  {t("nav.signedInAs")}
                </span>
                <span className="block truncate text-sm font-semibold text-ink">
                  {adminName}
                </span>
              </span>
              <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      </Dialog.Root>
      <AdminSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}
