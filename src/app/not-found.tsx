import Link from "next/link";
import { Home, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden p-6 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-brand [background-size:32px_32px] opacity-40" />
      <Logo className="h-16" />
      <p className="mt-8 font-display text-7xl font-extrabold text-gradient">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild variant="gradient">
          <Link href="/">
            <Home className="h-4 w-4" /> Home
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/track">
            <Search className="h-4 w-4" /> Track a Case
          </Link>
        </Button>
      </div>
    </main>
  );
}
