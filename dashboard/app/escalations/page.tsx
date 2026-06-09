"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface Escalation {
  id: string;
  call_id?: string;
  tier: number;
  reason: string;
  action_taken?: string;
  resolved_by?: string;
  resolved_at?: string;
  status: string;
  created_at: string;
}

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/escalations");
        const data = await res.json();
        setEscalations((data.escalations || []).map((e: any) => ({
          id: e.id,
          call_id: e.call_id,
          tier: e.tier || e.escalation_tier || 1,
          reason: e.reason || e.summary || "Escalated from AI agent",
          action_taken: e.action_taken,
          resolved_by: e.resolved_by,
          status: e.status || "pending",
          created_at: e.created_at,
        })));
      } catch (err) {
        console.error("Failed to fetch escalations:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const pending = escalations.filter((e) => e.status === "pending");
  const inProgress = escalations.filter((e) => e.status === "in_progress");
  const resolved = escalations.filter((e) => e.status === "resolved");

  return (
    <div>
      <PageHeader
        title="Escalations"
        description="Manage call escalations and human handoffs"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-[#111827]">{pending.length}</p>
                <p className="text-sm text-[#6B7280]">Pending</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#CA8A04]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-[#111827]">{inProgress.length}</p>
                <p className="text-sm text-[#6B7280]">In Progress</p>
              </div>
              <Clock className="w-8 h-8 text-[#CA8A04] opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#16A34A]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-[#111827]">{resolved.length}</p>
                <p className="text-sm text-[#6B7280]">Resolved</p>
              </div>
              <CheckCircle className="w-8 h-8 text-[#16A34A] opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escalation List */}
      <Card>
        <CardHeader>
          <CardTitle>All Escalations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton rows={4} />
          ) : escalations.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No escalations"
              description="Escalated calls will appear here when AI transfers to a human agent."
            />
          ) : (
            <div className="space-y-2">
              {escalations.map((esc) => (
                <div
                  key={esc.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-[#E5E7EB] hover:border-[#16A34A] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">
                        Tier {esc.tier} Escalation
                      </p>
                      <p className="text-sm text-[#6B7280] truncate max-w-md">
                        {esc.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={esc.status} />
                    <span className="text-xs text-[#6B7280]">
                      {esc.created_at
                        ? new Date(esc.created_at).toLocaleDateString("en-IN")
                        : "—"}
                    </span>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
