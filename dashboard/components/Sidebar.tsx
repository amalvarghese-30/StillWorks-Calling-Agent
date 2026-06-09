"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Target,
  Briefcase,
  Calendar,
  Wrench,
  PhoneCall,
  Radio,
  History,
  AlertTriangle,
  Settings2,
  FileText,
  RefreshCw,
  Megaphone,
  TrendingUp,
  IndianRupee,
  BarChart3,
  Settings,
  Funnel,
  Package,
  Headset,
  Activity,
} from "lucide-react";

import NotificationBell from "./NotificationBell";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "CRM",
    items: [
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/leads", label: "Leads", icon: Target },
    ],
  },
  {
    title: "Calendar",
    items: [
      { href: "/calendar", label: "Appointments", icon: Calendar },
      { href: "/services", label: "Service Ops", icon: Wrench },
    ],
  },
  {
    title: "Voice AI",
    items: [
      { href: "/call-center", label: "Call Center", icon: Headset },
      { href: "/voice", label: "Live Calls", icon: Radio },
      { href: "/calls", label: "Call History", icon: History },
      { href: "/escalations", label: "Escalations", icon: AlertTriangle },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/quotes", label: "Quotes", icon: FileText },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/operations", label: "Operations", icon: Activity },
    ],
  },
  {
    title: "Analytics",
    items: [
      { href: "/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/analytics/executive", label: "Executive", icon: IndianRupee },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.user && setSession(data.user))
      .catch(() => {});
  }, []);

  const initials = session?.name
    ? session.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 flex flex-col bg-white border-r border-[#E5E7EB]">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-[#E5E7EB] shrink-0">
        <div className="w-9 h-9 rounded-lg bg-[#16A34A] flex items-center justify-center shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 10c-.5-2-2.3-4-5-4s-4.5 2-5 4" />
            <circle cx="7" cy="10" r="2" />
            <circle cx="17" cy="10" r="2" />
            <path d="M5 20h14" />
            <path d="M17 10v10" />
            <path d="M7 10v10" />
            <rect x="4" y="14" width="16" height="6" rx="1" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[#111827] text-base leading-tight">AgriForge</div>
          <div className="text-xs text-[#9CA3AF] leading-tight">Voice AI Platform</div>
        </div>
        <NotificationBell />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-1">
            <div className="px-6 pt-3 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF]">
                {section.title}
              </span>
            </div>
            {section.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#DCFCE7] text-[#16A34A] border-r-2 border-[#16A34A] -mr-[1px]"
                      : "text-[#4B5563] hover:bg-gray-50 hover:text-[#111827]"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="border-t border-[#E5E7EB]">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 mx-3 my-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-[#DCFCE7] text-[#16A34A]"
              : "text-[#4B5563] hover:bg-gray-50 hover:text-[#111827]"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </div>

      {/* User footer */}
      <div className="h-14 flex items-center gap-3 px-6 border-t border-[#E5E7EB] shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center text-xs font-semibold text-[#16A34A]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[#111827] truncate">
            {session?.name || "Loading..."}
          </div>
          <div className="text-xs text-[#9CA3AF] truncate">
            {session?.email || ""}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
          title="Sign out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
