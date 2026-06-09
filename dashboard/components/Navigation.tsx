"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, Headphones, Settings, Users, Megaphone, LayoutDashboard } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbound', label: 'Inbound', icon: Headphones },
  { href: '/services', label: 'Services', icon: Settings },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-manas-green to-green-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-white group-hover:text-manas-green transition-colors">
            Manas Group
          </span>
          <span className="text-xs text-gray-500 hidden sm:inline">Voice AI</span>
        </Link>

        {/* Nav Items */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-manas-green/20 text-manas-green border border-manas-green/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-gray-400 hidden sm:inline">Online</span>
        </div>
      </div>
    </nav>
  );
}
