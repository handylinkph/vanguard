import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const LINKS = [["/admin", "Overview"], ["/admin/users", "Users & roles"], ["/admin/content", "Resource library"], ["/admin/services", "Services directory"], ["/admin/moderation", "Moderation"], ["/admin/organizations", "Organizations"], ["/admin/errors", "Errors"], ["/admin/audit", "Audit log"], ["/admin/settings", "Configuration"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <nav aria-label="Admin" className="mb-6 flex flex-wrap gap-2 border-b border-line pb-3">
        {LINKS.map(([href, label]) => <Link key={href} href={href} className="rounded-full border border-line bg-white px-3 py-1 text-sm hover:bg-surface">{label}</Link>)}
      </nav>
      {children}
    </div>
  );
}
