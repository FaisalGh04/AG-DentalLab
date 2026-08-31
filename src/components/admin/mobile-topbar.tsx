"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { MobileNavDrawer } from "@/components/admin/mobile-nav-drawer";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";
import { AdminThemeToggle } from "@/components/admin/admin-theme";
import { NotificationsInbox } from "@/components/admin/notifications-inbox";

export function MobileTopbar({ adminName }: { adminName: string }) {
  return (
    // px-3 / gap-1 below sm: the notifications button is a fourth control in a
    // row that already fitted a 390px phone exactly, and it pushed the language
    // toggle 13px past the viewport. Reclaimed from SPACING rather than by
    // shrinking any button — every tap target keeps its size, and the tighter
    // values apply only below sm where the pressure is.
    <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border/80 bg-white/[0.82] px-3 py-3 shadow-soft backdrop-blur sm:px-4 xl:hidden">
      <div className="flex items-center gap-2">
        <MobileNavDrawer adminName={adminName} />
        <Link href="/admin">
          <Logo className="h-8" withWordmark />
        </Link>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <NotificationsInbox variant="topbar" />
        <AdminThemeToggle className="px-2.5 [&_span]:hidden sm:[&_span]:inline" />
        <AdminLanguageToggle />
      </div>
    </div>
  );
}
