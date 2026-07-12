"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { MobileNavDrawer } from "@/components/admin/mobile-nav-drawer";
import { AdminLanguageToggle } from "@/components/admin/admin-language-toggle";

export function MobileTopbar() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-border/80 bg-white/[0.82] px-4 py-3 shadow-soft backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <MobileNavDrawer />
        <Link href="/admin">
          <Logo className="h-8" withWordmark />
        </Link>
      </div>
      <AdminLanguageToggle />
    </div>
  );
}
