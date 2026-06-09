"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const STAGE_FILLS: Record<string, string> = {
  New: "#D1D5DB", Contacted: "#93C5FD", Qualified: "#86EFAC",
  Demo: "#FDE68A", Negotiation: "#FCD34D", Won: "#16A34A", Lost: "#FCA5A5",
};

const OUTCOME_FILLS: Record<string, string> = {
  inquiry: "#16A34A", service: "#15803D", demo_booked: "#CA8A04",
  demo_scheduled: "#CA8A04", quote: "#FCD34D", no_answer: "#D1D5DB",
};

const PERF_FILLS: Record<string, string> = {
  Answered: "#16A34A", Escalated: "#CA8A04", "No Answer": "#D1D5DB", "Hung Up": "#9CA3AF",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/analytics");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const funnelData = (data?.leadFunnel || []).map((s: any) => ({
    ...s,
    fill: STAGE_FILLS[s.name] || "#D1D5DB",
  }));
  const callsPerDay = data?.callsPerDay || [];
  const revenueTrend = data?.revenueTrend || [];
  const conversionRate = data?.conversionRate || [];
  const outcomeData = (data?.outcomeDistribution || []).map((o: any) => ({
    ...o,
    fill: OUTCOME_FILLS[o.name] || "#9CA3AF",
  }));
  const agentPerf = (data?.agentPerformance || []).map((a: any) => ({
    ...a,
    fill: PERF_FILLS[a.name] || "#9CA3AF",
  }));

  if (loading) {
    return (
      <div>
        <PageHeader title="Analytics" description="Call metrics, revenue, and lead performance" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><LoadingSkeleton variant="card" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <PageHeader title="Analytics" description="Call metrics, revenue, and lead performance" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Quotes accepted · last 4 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" tickFormatter={(v: any) => `₹${(Number(v) / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(value: any) => [`₹${(Number(value) / 100000).toFixed(1)}L`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#16A34A" fill="#DCFCE7" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lead Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel</CardTitle>
            <CardDescription>Pipeline conversion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Calls Per Day */}
        <Card>
          <CardHeader>
            <CardTitle>Calls Per Day</CardTitle>
            <CardDescription>Inbound vs Outbound</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <Tooltip />
                  <Bar dataKey="inbound" fill="#16A34A" name="Inbound" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outbound" fill="#CA8A04" name="Outbound" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate</CardTitle>
            <CardDescription>Lead-to-won percentage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conversionRate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" tickFormatter={(v: any) => `${Number(v)}%`} domain={[0, 40]} />
                  <Tooltip formatter={(value: any) => [`${Number(value)}%`, "Conversion Rate"]} />
                  <Line type="monotone" dataKey="rate" stroke="#16A34A" strokeWidth={2} dot={{ fill: "#CA8A04" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Outcome Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Outcome Distribution</CardTitle>
            <CardDescription>Call outcomes by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {outcomeData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Call handling metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentPerf} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6B7280" tickFormatter={(v: any) => `${Number(v)}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" width={80} />
                  <Tooltip formatter={(value: any) => [`${Number(value)}%`, ""]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {agentPerf.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
