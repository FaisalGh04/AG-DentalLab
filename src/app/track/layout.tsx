import { QueryProvider } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

/**
 * /track needs React Query (the lookup mutation) and the toast surface (the
 * copy-tracking-id control), but not NextAuth. Scoping them here keeps them off
 * the public landing page. Client providers don't opt the route out of static
 * generation, so /track stays statically prerendered.
 */
export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      {children}
      <Toaster />
    </QueryProvider>
  );
}
