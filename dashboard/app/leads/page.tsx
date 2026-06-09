"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeadScoreBadge from "@/components/shared/LeadScoreBadge";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { Plus, IndianRupee } from "lucide-react";

interface Lead {
  id: string;
  customer_name: string;
  phone: string;
  status: string;
  lead_score: number;
  product_of_interest?: string;
  product_model?: string;
  budget_min?: number;
  budget_max?: number;
  urgency?: string;
  urgencyLabel?: string;
}

const STAGES = [
  { key: "new", label: "New", color: "border-l-blue-500" },
  { key: "contacted", label: "Contacted", color: "border-l-indigo-500" },
  { key: "qualified", label: "Qualified", color: "border-l-green-500" },
  { key: "demo_scheduled", label: "Demo Scheduled", color: "border-l-yellow-500" },
  { key: "negotiation", label: "Negotiation", color: "border-l-orange-500" },
  { key: "won", label: "Won", color: "border-l-emerald-500" },
  { key: "lost", label: "Lost", color: "border-l-red-500" },
];

function formatBudget(min?: number, max?: number): string {
  if (!min && !max) return "";
  const fmt = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(0)}L` : `₹${n.toLocaleString("en-IN")}`);
  if (min && max) return `${fmt(min)}–${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export default function LeadsPipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/leads");
        const data = await res.json();
        setLeads(data.leads || []);
      } catch (err) {
        console.error("Failed to fetch leads:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const leadsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage.key] = leads.filter((l) => l.status === stage.key);
      return acc;
    },
    {} as Record<string, Lead[]>
  );

  const totalPipelineValue = leads
    .filter((l) => l.status !== "lost" && l.status !== "won")
    .reduce((sum, l) => sum + (l.budget_max || l.budget_min || 0), 0);

  return (
    <div>
      <PageHeader
        title="Lead Pipeline"
        description={`${leads.length} leads · Pipeline Value: ${totalPipelineValue > 0 ? `₹${(totalPipelineValue / 100000).toFixed(1)}L` : "—"}`}
      >
        <Button size="sm">
          <Plus className="w-4 h-4" />
          New Lead
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <div className="overflow-x-auto pb-6">
          <div className="flex gap-4" style={{ minWidth: "1200px" }}>
            {STAGES.map((stage) => {
              const stageLeads = leadsByStage[stage.key] || [];
              const stageValue = stageLeads.reduce(
                (sum, l) => sum + (l.budget_max || l.budget_min || 0),
                0
              );
              return (
                <div key={stage.key} className="flex-1 min-w-[200px]">
                  <div className={`bg-gray-50 rounded-t-xl border border-[#E5E7EB] border-b-0 px-4 py-3 ${stage.color} border-l-4`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#111827]">{stage.label}</h3>
                      <span className="text-xs font-semibold text-[#6B7280] bg-white rounded-full px-2 py-0.5">
                        {stageLeads.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {(stageValue / 100000).toFixed(1)}L
                      </p>
                    )}
                  </div>
                  <div className="bg-white border border-[#E5E7EB] border-t-0 rounded-b-xl p-2 space-y-2 min-h-[300px]">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3 rounded-lg border border-[#E5E7EB] hover:border-[#16A34A] hover:shadow-sm transition-all cursor-pointer bg-white"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#111827] truncate">
                            {lead.customer_name || "Unknown"}
                          </span>
                          <LeadScoreBadge score={lead.lead_score || 0} />
                        </div>
                        {lead.product_of_interest && (
                          <p className="text-xs text-[#6B7280] mb-1 truncate">
                            {lead.product_of_interest}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#6B7280]">
                            {formatBudget(lead.budget_min, lead.budget_max) || "No budget"}
                          </span>
                          {lead.urgency && (
                            <span className={`text-xs font-medium ${
                              lead.urgency === "high" ? "text-red-600" : lead.urgency === "medium" ? "text-[#CA8A04]" : "text-[#6B7280]"
                            }`}>
                              {lead.urgency}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="flex items-center justify-center h-24 text-xs text-[#9CA3AF]">
                        No leads
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
