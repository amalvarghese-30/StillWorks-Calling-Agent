"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/shared/StatusBadge";
import LeadScoreBadge from "@/components/shared/LeadScoreBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import {
  Radio,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  PhoneIncoming,
  PhoneOutgoing,
  Brain,
  Volume2,
  Mic,
} from "lucide-react";

interface AgentHealthData {
  status: string;
  model: string;
  stt: string;
  tts: string;
  activeCalls: number;
  todayCalls: number;
  avgDuration: number;
  avgLeadScore: number;
  escalationRate: number;
}

interface Call {
  id: string;
  phone_number?: string;
  direction: string;
  duration_seconds: number;
  status: string;
  outcome?: string;
  lead_score?: number;
  language_used?: string;
  summary?: string;
}

export default function VoiceAIConsolePage() {
  const [activeCalls, setActiveCalls] = useState<Call[]>([]);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [agentHealth, setAgentHealth] = useState<AgentHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [callsRes, healthRes] = await Promise.all([
          fetch("/api/calls"),
          fetch("/api/agent-health"),
        ]);
        const callsData = await callsRes.json();
        const healthData = await healthRes.json();
        const allCalls = callsData.calls || [];
        setActiveCalls(allCalls.filter((c: Call) => c.status === "in_progress"));
        setRecentCalls(allCalls.slice(0, 10));
        setAgentHealth(healthData);
      } catch (err) {
        console.error("Failed to fetch calls:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const agentStats = {
    status: agentHealth?.status || "unknown",
    model: agentHealth?.model || "—",
    stt: agentHealth?.stt || "—",
    tts: agentHealth?.tts || "—",
    activeCalls: agentHealth?.activeCalls ?? activeCalls.length,
    todayCalls: agentHealth?.todayCalls ?? recentCalls.length,
    avgDuration: agentHealth?.avgDuration || (recentCalls.length > 0
      ? Math.round(recentCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / recentCalls.length)
      : 0),
    avgLeadScore: agentHealth?.avgLeadScore || (recentCalls.filter(c => c.lead_score).length > 0
      ? Math.round(recentCalls.reduce((sum, c) => sum + (c.lead_score || 0), 0) / recentCalls.filter(c => c.lead_score).length)
      : 0),
    escalationRate: agentHealth?.escalationRate ?? 0,
  };

  return (
    <div>
      <PageHeader
        title="Voice AI Console"
        description="Live call monitoring and agent health"
      />

      {/* Agent Health Card */}
      <Card className="mb-6 border-l-4 border-l-[#16A34A]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#16A34A]" />
                Agent Health
              </CardTitle>
              <CardDescription>Real-time system status</CardDescription>
            </div>
            <Badge className="bg-[#DCFCE7] text-[#16A34A] hover:bg-[#DCFCE7]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse mr-2" />
              {agentStats.status === "online" ? "Online" : "Offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="space-y-1">
              <span className="text-xs text-[#6B7280]">Active Calls</span>
              <p className="text-lg font-bold text-[#111827]">{agentStats.activeCalls}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#6B7280]">Today&apos;s Calls</span>
              <p className="text-lg font-bold text-[#111827]">{agentStats.todayCalls}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#6B7280]">Avg Duration</span>
              <p className="text-lg font-bold text-[#111827]">{agentStats.avgDuration}s</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#6B7280]">Avg Lead Score</span>
              <p className="text-lg font-bold text-[#111827]">{agentStats.avgLeadScore || "—"}</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#6B7280]">Escalation Rate</span>
              <p className="text-lg font-bold text-[#CA8A04]">{agentStats.escalationRate}%</p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#6B7280]">STT Provider</span>
              <p className="text-sm font-semibold text-[#111827] flex items-center gap-1">
                <Mic className="w-3 h-3" /> {agentStats.stt}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-[#6B7280]">TTS Provider</span>
              <p className="text-sm font-semibold text-[#111827] flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> {agentStats.tts}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Calls */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#111827] mb-4">
          Live Calls ({activeCalls.length})
        </h2>
        {loading ? (
          <LoadingSkeleton variant="card" />
        ) : activeCalls.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                icon={PhoneIncoming}
                title="No active calls"
                description="Live calls will appear here when the agent is handling conversations."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCalls.map((call) => (
              <Card key={call.id} className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-semibold text-red-600 uppercase">Live</span>
                    </div>
                    <span className="text-xs text-[#6B7280]">
                      {call.direction === "inbound" ? "Inbound" : "Outbound"}
                    </span>
                  </div>
                  <p className="font-medium text-[#111827]">{call.phone_number || "Connecting..."}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-[#6B7280]">
                    <span>Duration: {call.duration_seconds || 0}s</span>
                    {call.language_used && <span>· {call.language_used.toUpperCase()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Call History */}
      <h2 className="text-lg font-semibold text-[#111827] mb-4">Recent Activity</h2>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><LoadingSkeleton rows={5} /></div>
          ) : recentCalls.length === 0 ? (
            <div className="py-12">
              <EmptyState icon={PhoneIncoming} title="No calls yet" description="Call history will appear here." />
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB]">
              {recentCalls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {call.direction === "inbound" ? (
                      <PhoneIncoming className="w-4 h-4 text-[#16A34A] shrink-0" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4 text-[#CA8A04] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#111827]">{call.phone_number || "—"}</p>
                      {call.summary && (
                        <p className="text-xs text-[#6B7280] truncate">{call.summary}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {call.lead_score != null && <LeadScoreBadge score={call.lead_score} />}
                    {call.outcome && <StatusBadge status={call.outcome} />}
                    <span className="text-xs text-[#6B7280]">
                      {call.duration_seconds ? `${call.duration_seconds}s` : "—"}
                    </span>
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
