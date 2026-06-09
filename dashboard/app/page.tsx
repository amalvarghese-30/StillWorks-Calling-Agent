"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import KpiCard from "@/components/shared/KpiCard";
import StatusBadge from "@/components/shared/StatusBadge";
import LeadScoreBadge from "@/components/shared/LeadScoreBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import {
  Phone,
  Target,
  Calendar,
  TrendingUp,
  IndianRupee,
  Radio,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  FunnelChart,
  Funnel,
  LabelList,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import Link from "next/link";

interface DashboardStats {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  active_bookings: number;
  open_leads: number;
  total_customers: number;
}

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
  created_at: string;
}

interface AgentHealth {
  status: string;
  model: string;
  activeCalls: number;
  todayCalls: number;
  avgDuration: number;
  escalationRate: number;
}

interface AnalyticsData {
  leadFunnel: { name: string; value: number }[];
  callsPerDay: { day: string; inbound: number; outbound: number }[];
  kpis: {
    totalRevenue: number;
    conversionRate: number;
    pipelineValue: number;
    totalCalls: number;
  };
}

const STAGE_FILLS: Record<string, string> = {
  New: "#D1D5DB",
  Contacted: "#93C5FD",
  Qualified: "#86EFAC",
  Demo: "#FDE68A",
  Negotiation: "#FCD34D",
  Won: "#16A34A",
  Lost: "#FCA5A5",
};

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [agentHealth, setAgentHealth] = useState<AgentHealth | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, callsRes, healthRes, analyticsRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/calls"),
          fetch("/api/agent-health"),
          fetch("/api/analytics"),
        ]);
        const statsData = await statsRes.json();
        const callsData = await callsRes.json();
        const healthData = await healthRes.json();
        const analyticsData = await analyticsRes.json();
        setStats(statsData);
        setRecentCalls(callsData.calls?.slice(0, 8) || []);
        setAgentHealth(healthData);
        setAnalytics(analyticsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const funnelData = (analytics?.leadFunnel || []).map((s) => ({
    ...s,
    fill: STAGE_FILLS[s.name] || "#D1D5DB",
  }));
  const callsPerDay = analytics?.callsPerDay || [];
  const revenueDisplay = analytics?.kpis?.totalRevenue
    ? `₹${(analytics.kpis.totalRevenue / 100000).toFixed(1)}L`
    : "₹0";
  const conversionDisplay = analytics?.kpis?.conversionRate
    ? `${analytics.kpis.conversionRate}%`
    : "0%";

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of voice AI operations and CRM pipeline"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} variant="kpi" />)
        ) : (
          <>
            <KpiCard
              title="Total Calls"
              value={stats?.total_calls || 0}
              icon={Phone}
              change="+12% vs last month"
              changePositive
            />
            <KpiCard
              title="Active Leads"
              value={stats?.open_leads || 0}
              icon={Target}
              change="5 new this week"
            />
            <KpiCard
              title="Today's Appointments"
              value={stats?.active_bookings || 0}
              icon={Calendar}
            />
            <KpiCard
              title="Conversion Rate"
              value={conversionDisplay}
              icon={TrendingUp}
            />
            <KpiCard
              title="Revenue Generated"
              value={revenueDisplay}
              icon={IndianRupee}
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Lead Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel</CardTitle>
            <CardDescription>Pipeline distribution by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList
                      position="right"
                      fill="#374151"
                      stroke="none"
                      dataKey="name"
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Calls Per Day */}
        <Card>
          <CardHeader>
            <CardTitle>Calls Per Day</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={callsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="inbound"
                    stackId="1"
                    stroke="#16A34A"
                    fill="#DCFCE7"
                    name="Inbound"
                  />
                  <Area
                    type="monotone"
                    dataKey="outbound"
                    stackId="1"
                    stroke="#CA8A04"
                    fill="#FEF9C3"
                    name="Outbound"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice AI Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#16A34A]" />
                Voice AI Status
              </CardTitle>
              <CardDescription>Current agent health</CardDescription>
            </div>
            <Link
              href="/voice"
              className="text-sm text-[#16A34A] hover:underline flex items-center gap-1"
            >
              Console <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-[#6B7280]">Agent Status</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${agentHealth?.status === 'online' ? 'bg-[#16A34A]' : 'bg-red-500'}`} />
                  <span className="text-sm font-semibold text-[#111827]">{agentHealth?.status || "Offline"}</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-[#6B7280]">Model</span>
                <p className="text-sm font-semibold text-[#111827]">{agentHealth?.model || "—"}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-[#6B7280]">Today's Calls</span>
                <p className="text-sm font-semibold text-[#111827]">{agentHealth?.todayCalls || 0}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-[#6B7280]">Escalation Rate</span>
                <p className="text-sm font-semibold text-[#CA8A04]">{agentHealth?.escalationRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>Latest call activity</CardDescription>
            </div>
            <Link
              href="/calls"
              className="text-sm text-[#16A34A] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton variant="table" rows={4} />
            ) : recentCalls.length === 0 ? (
              <p className="text-sm text-[#6B7280] py-8 text-center">No recent calls</p>
            ) : (
              <div className="space-y-2">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {call.direction === "inbound" ? (
                        <PhoneIncoming className="w-4 h-4 text-[#16A34A] shrink-0" />
                      ) : (
                        <PhoneOutgoing className="w-4 h-4 text-[#CA8A04] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate">
                          {call.phone_number || "Unknown"}
                        </p>
                        {call.summary && (
                          <p className="text-xs text-[#6B7280] truncate">{call.summary}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {call.lead_score != null && call.lead_score > 0 && (
                        <LeadScoreBadge score={call.lead_score} />
                      )}
                      {call.outcome && <StatusBadge status={call.outcome} />}
                      <span className="text-xs text-[#6B7280]">
                        {call.duration_seconds
                          ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Combined feed of calls, appointments, and quotes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSkeleton variant="table" rows={4} />
          ) : recentCalls.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {recentCalls.slice(0, 5).map((call, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 text-sm">
                  <span className="text-[#6B7280] w-12 shrink-0">
                    {call.created_at
                      ? new Date(call.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                  <span className="shrink-0">
                    {call.direction === "inbound" ? "📥" : "📤"}
                  </span>
                  <span className="font-medium text-[#111827] truncate">
                    {call.phone_number || "Unknown"}
                  </span>
                  <span className="text-[#6B7280] truncate">
                    {call.summary || call.outcome || "Call completed"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
