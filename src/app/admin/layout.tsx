import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminProviders } from "@/components/providers";
import { Sidebar } from "@/components/admin/sidebar";
import { MobileTopbar } from "@/components/admin/mobile-topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <AdminProviders>
      <div className="flex min-h-dvh bg-[linear-gradient(135deg,rgba(243,248,245,0.92),rgba(255,255,255,0.78))]">
        <Sidebar adminName={session.user.name ?? session.user.email ?? "Admin"} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopbar />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </AdminProviders>
  );
}
