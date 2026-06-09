"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import DataTable from "@/components/shared/DataTable";
import KpiCard from "@/components/shared/KpiCard";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { Wrench, CheckCircle, Clock, Calendar } from "lucide-react";

interface Appointment {
  id: string;
  booking_ref?: string;
  customer_name?: string;
  phone?: string;
  type: string;
  product_model?: string;
  issue_description?: string;
  date?: string;
  time_slot?: string;
  location?: string;
  status: string;
  created_at: string;
}

export default function ServiceOperationsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/service-bookings");
        const data = await res.json();
        setAppointments(
          (data.bookings || []).filter((b: Appointment) => b.type === "service")
        );
      } catch (err) {
        console.error("Failed to fetch services:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayServices = appointments.filter((a) => a.date === today);
  const pending = appointments.filter((a) => a.status === "pending" || a.status === "confirmed");
  const completed = appointments.filter((a) => a.status === "completed");

  // Compute avg resolution time for completed appointments
  let avgResolution = "—";
  const withDates = completed.filter((a) => a.created_at && a.date);
  if (withDates.length > 0) {
    const totalDays = withDates.reduce((sum, a) => {
      const created = new Date(a.created_at!).getTime();
      const resolved = new Date(a.date!).getTime();
      return sum + (resolved - created) / (1000 * 60 * 60 * 24);
    }, 0);
    avgResolution = `${(totalDays / withDates.length).toFixed(1)}d`;
  }

  const columns = [
    {
      key: "date",
      header: "Date",
      cell: (row: Appointment) => (
        <span className="text-sm">
          {row.date ? new Date(row.date).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    { key: "customer_name", header: "Customer", cell: (row: Appointment) => <span className="font-medium">{row.customer_name || row.phone || "—"}</span> },
    {
      key: "product_model",
      header: "Product",
      cell: (row: Appointment) => <span>{row.product_model || "—"}</span>,
    },
    {
      key: "issue_description",
      header: "Issue",
      cell: (row: Appointment) => (
        <span className="text-sm text-[#6B7280] truncate max-w-[200px] block">
          {row.issue_description || "—"}
        </span>
      ),
    },
    { key: "time_slot", header: "Time", cell: (row: Appointment) => <span className="text-xs">{row.time_slot || "—"}</span> },
    {
      key: "status",
      header: "Status",
      cell: (row: Appointment) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Service Operations"
        description="Manage service visits, technician assignments, and repair tracking"
      >
        <Button size="sm">
          <Calendar className="w-4 h-4" />
          New Service
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Today's Services" value={todayServices.length} icon={Wrench} />
        <KpiCard title="Pending" value={pending.length} icon={Clock} />
        <KpiCard title="Completed" value={completed.length} icon={CheckCircle} />
        <KpiCard
          title="Avg Resolution"
          value={avgResolution}
          icon={CheckCircle}
        />
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : (
            <DataTable
              columns={columns}
              data={appointments.filter((a) => a.status !== "completed" && a.status !== "cancelled")}
              keyField="id"
              emptyMessage="No upcoming services"
            />
          )}
        </TabsContent>
        <TabsContent value="active">
          <DataTable columns={columns} data={appointments.filter((a) => a.status === "in_progress")} keyField="id" emptyMessage="No active services" />
        </TabsContent>
        <TabsContent value="completed">
          <DataTable columns={columns} data={completed} keyField="id" emptyMessage="No completed services" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
