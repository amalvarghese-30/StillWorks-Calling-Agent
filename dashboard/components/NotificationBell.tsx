"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, Phone, FileText, Calendar, AlertTriangle, Check } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: number;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=true");
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.notifications || [];
      setNotifications(list.slice(0, 20));
      setUnreadCount(list.filter((n: Notification) => !n.read).length);
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "call_completed":
      case "call_failed":
        return <Phone className="w-4 h-4 text-green-600" />;
      case "quote_generated":
      case "quote_accepted":
        return <FileText className="w-4 h-4 text-amber-600" />;
      case "appointment_created":
      case "appointment_reminder":
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case "escalation":
      case "high_priority_alert":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-gray-500">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 flex gap-3 items-start cursor-pointer hover:bg-gray-50 transition-colors ${
                      !n.read ? "bg-green-50/50" : ""
                    }`}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {n.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {n.created_at
                          ? new Date(n.created_at).toLocaleString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })
                          : ""}
                      </div>
                    </div>
                    {!n.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(n.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Check className="w-3 h-3 text-green-600" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
