"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 bg-[#F8FAF7] min-h-screen">
        <div className="p-6 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
