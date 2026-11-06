"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { NAV, MOBILE_PRIMARY } from "./nav";
import { NavIcon } from "./icon";
import { ConnectivityBadge } from "@/components/offline/connectivity";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export function AppShell({ children, userName, isAdmin, orgCount, banner, signOut }: {
  children: React.ReactNode; userName: string; isAdmin: boolean; orgCount: number; banner?: string; signOut: () => Promise<void>;
}) {
  const path = usePathname();
  // The drawer is tied to the path it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (v: boolean) => setOpenOn(v ? path : null);
  const active = (href: string) => path === href || path.startsWith(href + "/");
  const groups = isAdmin ? [...NAV, { label: "Administration", items: [{ href: "/admin", label: "Admin Console", icon: "shield" }] }] : NAV;

  const NavList = (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-white/50">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} aria-current={active(i.href) ? "page" : undefined}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white",
                    active(i.href) && "bg-white/15 font-medium text-white")}>
                  <NavIcon name={i.icon} className="size-4" />{i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto bg-navy px-3 py-5 lg:flex">
        <Link href="/dashboard" className="mb-6 px-3"><Logo inverted /></Link>
        {NavList}
        <div className="mt-auto border-t border-white/10 pt-4 text-white/70">
          <p className="truncate px-3 text-xs">{userName}</p>
          <form action={signOut}><button className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10 hover:text-white"><LogOut className="size-4" />Sign out</button></form>
        </div>
      </aside>

      {/* Top bar */}
      <header className="app-header sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:px-8">
        <Link href="/dashboard" className="lg:hidden"><Logo /></Link>
        <div className="hidden text-sm text-muted lg:block">Ready at all times, all things, all places.</div>
        <div className="flex items-center gap-2">
          <ConnectivityBadge />
          <a href="tel:911" className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700" aria-label="Call 911 national emergency hotline">Call 911</a>
          <button className="rounded-lg p-2 hover:bg-surface lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu className="size-5" /></button>
        </div>
      </header>

      {banner && <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">{banner}</div>}

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 lg:px-8 lg:pb-12">{children}</main>

      {/* Mobile bottom nav */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {MOBILE_PRIMARY.map((i) => (
          <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted", active(i.href) && "text-brand-700 font-medium")}>
            <NavIcon name={i.icon} className="size-5" />{i.label}
          </Link>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted" aria-label="More navigation">
          <Menu className="size-5" />More
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-navy-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col overflow-y-auto bg-navy px-3 py-4">
            <div className="mb-4 flex items-center justify-between px-3">
              <Logo inverted />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded p-1 text-white hover:bg-white/10"><X className="size-5" /></button>
            </div>
            {NavList}
            {orgCount > 0 && <p className="mt-4 px-3 text-xs text-white/60">{orgCount} organization{orgCount > 1 ? "s" : ""}</p>}
            <form action={signOut} className="mt-auto pt-4"><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"><LogOut className="size-4" />Sign out</button></form>
          </div>
        </div>
      )}
    </div>
  );
}
