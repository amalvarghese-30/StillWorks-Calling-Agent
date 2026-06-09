"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import LeadScoreBadge from "@/components/shared/LeadScoreBadge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import CallDetailDrawer from "@/components/CallDetailDrawer";
import { Search, PhoneIncoming, PhoneOutgoing, Phone } from "lucide-react";

interface Call {
  id: string;
  call_id?: string;
  phone_number?: string;
  direction: string;
  duration_seconds: number;
  status: string;
  outcome?: string;
  lead_score?: number;
  summary?: string;
  language_used?: string;
  created_at: string;
}

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (direction && direction !== "all") params.set("direction", direction);
        const res = await fetch(`/api/calls?${params}`);
        const data = await res.json();
        setCalls(data.calls || []);
      } catch (err) {
        console.error("Failed to fetch calls:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [direction]);

  const filtered = search
    ? calls.filter(
        (c) =>
          c.phone_number?.includes(search) ||
          c.summary?.toLowerCase().includes(search.toLowerCase())
      )
    : calls;

  const columns = [
    {
      key: "created_at",
      header: "Time",
      cell: (row: Call) => (
        <span className="text-xs text-[#6B7280] whitespace-nowrap">
          {row.created_at
            ? new Date(row.created_at).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      ),
    },
    {
      key: "direction",
      header: "",
      cell: (row: Call) =>
        row.direction === "inbound" ? (
          <PhoneIncoming className="w-4 h-4 text-[#16A34A]" />
        ) : (
          <PhoneOutgoing className="w-4 h-4 text-[#CA8A04]" />
        ),
    },
    {
      key: "phone_number",
      header: "Customer",
      cell: (row: Call) => (
        <span className="font-medium text-[#111827]">{row.phone_number || "—"}</span>
      ),
    },
    {
      key: "duration_seconds",
      header: "Duration",
      cell: (row: Call) => (
        <span className="text-xs text-[#6B7280]">
          {row.duration_seconds
            ? `${Math.floor(row.duration_seconds / 60)}m ${row.duration_seconds % 60}s`
            : "—"}
        </span>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      cell: (row: Call) =>
        row.outcome ? <StatusBadge status={row.outcome} /> : "—",
    },
    {
      key: "lead_score",
      header: "Score",
      cell: (row: Call) =>
        row.lead_score != null ? <LeadScoreBadge score={row.lead_score} /> : "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Call History"
        description="Browse and filter all calls"
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by phone or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={direction} onValueChange={setDirection}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Directions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No calls found"
          description="Call history from voice AI conversations will appear here."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyField="id"
          onRowClick={(row) => { setSelectedCallId(row.id); setDrawerOpen(true); }}
        />
      )}

      <CallDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        callId={selectedCallId}
      />
    </div>
  );
}
