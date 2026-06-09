"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import { Plus } from "lucide-react";

interface Appointment {
  id: string;
  booking_ref?: string;
  customer_name?: string;
  phone?: string;
  type: string;
  product_model?: string;
  date?: string;
  time_slot?: string;
  location?: string;
  status: string;
}

const EVENT_COLORS: Record<string, string> = {
  demo: "#16A34A",
  service: "#CA8A04",
  follow_up: "#2563EB",
};

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/service-bookings");
        const data = await res.json();
        setAppointments(data.bookings || []);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const events = appointments
    .filter((a) => a.date)
    .map((a) => ({
      id: a.id,
      title: `${a.type === "demo" ? "Demo" : "Service"}: ${a.customer_name || a.phone || ""}`,
      start: a.date || "",
      backgroundColor: EVENT_COLORS[a.type] || EVENT_COLORS.service,
      borderColor: EVENT_COLORS[a.type] || EVENT_COLORS.service,
      textColor: "#FFFFFF",
      extendedProps: { ...a },
    }));

  const upcoming = appointments
    .filter((a) => a.status !== "cancelled" && a.date)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(0, 8);

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Manage demos, service visits, and follow-ups"
      >
        <Button size="sm">
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <LoadingSkeleton variant="card" />
              ) : (
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                  }}
                  events={events}
                  height="auto"
                  buttonText={{ today: "Today" }}
                  eventTimeFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Next appointments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton rows={4} />
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-8 text-center">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-lg border border-[#E5E7EB] hover:border-[#16A34A] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[#111827]">
                        {apt.customer_name || apt.phone || "—"}
                      </span>
                      <StatusBadge status={apt.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <Badge variant={apt.type === "demo" ? "success" : "warning"} className="text-[10px]">
                        {apt.type === "demo" ? "Demo" : "Service"}
                      </Badge>
                      <span>{apt.date ? new Date(apt.date).toLocaleDateString("en-IN") : "—"}</span>
                      {apt.time_slot && <span>· {apt.time_slot}</span>}
                    </div>
                    {apt.product_model && (
                      <p className="text-xs text-[#6B7280] mt-1">{apt.product_model}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
