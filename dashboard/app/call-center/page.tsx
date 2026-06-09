"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import LeadScoreBadge from "@/components/shared/LeadScoreBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import DialerModal from "@/components/DialerModal";
import CallDetailDrawer from "@/components/CallDetailDrawer";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Megaphone,
  AlertTriangle,
  TrendingUp,
  Clock,
  Radio,
  User,
  Play,
  Pause,
  Square,
  RefreshCw,
} from "lucide-react";

interface Call {
  id: string;
  phone_number?: string;
  customer_name?: string;
  direction: string;
  call_type?: string;
  duration_seconds?: number;
  status: string;
  outcome?: string;
  lead_score?: number;
  summary?: string;
  language_used?: string;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  numbers_count: number;
  calls_dispatched: number;
  processed_count?: number;
  answered_calls: number;
  leads_generated: number;
  appointments_created?: number;
  created_at: string;
  started_at?: string;
}

export default function CallCenterPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialerOpen, setDialerOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [callsRes, campaignsRes] = await Promise.all([
        fetch("/api/calls"),
        fetch("/api/campaigns"),
      ]);
      const callsData = await callsRes.json();
      const campaignsData = await campaignsRes.json();
      setCalls(callsData.calls || []);
      setCampaigns(campaignsData.campaigns || []);
    } catch (err) {
      console.error("Error fetching call center data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const liveCalls = calls.filter(c => c.status === "in_progress" || c.status === "initiated");
  const inboundToday = calls.filter(c => c.direction === "inbound");
  const outboundToday = calls.filter(c => c.direction === "outbound");
  const campaignCalls = calls.filter(c => c.call_type && c.call_type !== "manual_outbound" && c.direction === "outbound" && c.call_type !== "inquiry");
  const escalations = calls.filter(c => c.status === "transferred" || c.outcome === "transferred");
  const answeredCalls = calls.filter(c => c.status === "completed" || c.status === "answered");
  const answerRate = calls.length > 0 ? Math.round((answeredCalls.length / calls.length) * 100) : 0;

  const runningCampaigns = campaigns.filter(c => c.status === "running" || c.status === "draft");
  const campaignHistory = campaigns.filter(c => c.status === "completed" || c.status === "failed");

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (err) {
      console.error("Error updating campaign:", err);
    }
  };

  const openCallDetail = (callId: string) => {
    setSelectedCallId(callId);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Call Center" description="Unified call operations dashboard" />
        <LoadingSkeleton variant="kpi" />
        <LoadingSkeleton variant="table" rows={8} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Call Center" description="Unified call operations dashboard" />
        <Button onClick={() => setDialerOpen(true)} className="bg-[#16A34A] hover:bg-[#15803D] shrink-0">
          <Phone className="w-4 h-4 mr-2" />
          Call Now
        </Button>
      </div>

      {/* Live Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Radio className="w-4 h-4 text-red-500" />
              <span className="text-xs text-[#6B7280]">Active Calls</span>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{liveCalls.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PhoneIncoming className="w-4 h-4 text-[#16A34A]" />
              <span className="text-xs text-[#6B7280]">Inbound Today</span>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{inboundToday.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PhoneOutgoing className="w-4 h-4 text-[#CA8A04]" />
              <span className="text-xs text-[#6B7280]">Outbound Today</span>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{outboundToday.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="w-4 h-4 text-[#2563EB]" />
              <span className="text-xs text-[#6B7280]">Campaign Calls</span>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{campaignCalls.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-[#CA8A04]" />
              <span className="text-xs text-[#6B7280]">Escalations</span>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{escalations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#16A34A]" />
              <span className="text-xs text-[#6B7280]">Answer Rate</span>
            </div>
            <p className="text-2xl font-bold text-[#111827]">{answerRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Calls Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-red-500" />
                  Live Calls
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>{liveCalls.length} active · {calls.length} total today</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {calls.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Phone}
                    title="No calls yet"
                    description="Calls will appear here when the agent starts handling conversations."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] bg-gray-50">
                        <th className="text-left p-3 font-medium text-[#6B7280] text-xs">Direction</th>
                        <th className="text-left p-3 font-medium text-[#6B7280] text-xs">Customer</th>
                        <th className="text-left p-3 font-medium text-[#6B7280] text-xs">Phone</th>
                        <th className="text-left p-3 font-medium text-[#6B7280] text-xs">Campaign</th>
                        <th className="text-left p-3 font-medium text-[#6B7280] text-xs">Duration</th>
                        <th className="text-left p-3 font-medium text-[#6B7280] text-xs">Status</th>
                        <th className="text-left p-3 font-medium text-[#6B7280] text-xs">Score</th>
                        <th className="text-left p-3 font-medium text-[#6B7280] text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {calls.slice(0, 20).map((call) => (
                        <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            {call.direction === "inbound" ? (
                              <PhoneIncoming className="w-4 h-4 text-[#16A34A]" />
                            ) : (
                              <PhoneOutgoing className="w-4 h-4 text-[#CA8A04]" />
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#9CA3AF]" />
                              <span className="font-medium text-[#111827]">
                                {call.customer_name || "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-xs text-[#6B7280]">
                            {call.phone_number || "—"}
                          </td>
                          <td className="p-3">
                            {call.call_type ? (
                              <Badge variant="outline" className="text-xs capitalize">
                                {call.call_type.replace(/_/g, " ")}
                              </Badge>
                            ) : (
                              <span className="text-xs text-[#9CA3AF]">—</span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-[#6B7280]">
                            {call.duration_seconds
                              ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                              : "—"}
                          </td>
                          <td className="p-3">
                            <StatusBadge status={call.status} />
                          </td>
                          <td className="p-3">
                            {call.lead_score != null ? (
                              <LeadScoreBadge score={call.lead_score} />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCallDetail(call.id)}
                              className="text-xs text-[#16A34A] hover:text-[#15803D]"
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Campaigns Sidebar */}
        <div className="space-y-6">
          {/* Active Campaigns */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="w-4 h-4 text-[#2563EB]" />
                Active Campaigns
              </CardTitle>
              <CardDescription>{runningCampaigns.length} running</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {runningCampaigns.length === 0 ? (
                <p className="text-sm text-[#6B7280] text-center py-4">
                  No active campaigns. Start one from the Campaigns page.
                </p>
              ) : (
                runningCampaigns.map((c) => {
                  const progress = c.numbers_count > 0
                    ? Math.round(((c.processed_count || c.calls_dispatched || 0) / c.numbers_count) * 100)
                    : 0;
                  return (
                    <div key={c.id} className="border border-[#E5E7EB] rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-[#111827] truncate">{c.name}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-[#16A34A] h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#6B7280]">
                        <span>{c.processed_count || c.calls_dispatched || 0} / {c.numbers_count}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="flex gap-1">
                        {c.status === "running" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => updateCampaignStatus(c.id, "paused")}
                            >
                              <Pause className="w-3 h-3 mr-1" /> Pause
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red-600"
                              onClick={() => updateCampaignStatus(c.id, "completed")}
                            >
                              <Square className="w-3 h-3 mr-1" /> Stop
                            </Button>
                          </>
                        ) : c.status === "paused" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => updateCampaignStatus(c.id, "running")}
                          >
                            <Play className="w-3 h-3 mr-1" /> Resume
                          </Button>
                        ) : c.status === "draft" ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-[#16A34A] hover:bg-[#15803D]"
                            onClick={() => updateCampaignStatus(c.id, "running")}
                          >
                            <Play className="w-3 h-3 mr-1" /> Start
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Campaign History */}
          {campaignHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4 text-[#6B7280]" />
                  Campaign History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {campaignHistory.map((c) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-[#111827] truncate max-w-[180px]">{c.name}</p>
                      <p className="text-xs text-[#6B7280]">
                        {c.leads_generated || 0} leads · {c.answered_calls || 0} answered
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialer Modal */}
      <DialerModal open={dialerOpen} onOpenChange={setDialerOpen} />

      {/* Call Detail Drawer */}
      <CallDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        callId={selectedCallId}
      />
    </div>
  );
}
