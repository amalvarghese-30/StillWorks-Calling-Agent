"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import KpiCard from "@/components/shared/KpiCard";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { IndianRupee, TrendingUp, Target, Phone, Megaphone } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SOURCE_FILLS: Record<string, string> = {
  "Inbound Call": "#16A34A", Outbound: "#CA8A04", "Walk-in": "#2563EB", Referral: "#9CA3AF",
};

const PRODUCT_FILLS = ["#16A34A", "#15803D", "#CA8A04", "#FCD34D", "#9CA3AF"];

export default function ExecutiveDashboardPage() {
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

  const kpis = data?.kpis || {};
  const monthlyRevenue = data?.monthlyRevenue || [];
  const pipelineData = (data?.leadFunnel || []).filter((s: any) => s.name !== "Lost");
  const leadSourceData = (data?.leadSource || []).map((s: any) => ({
    ...s,
    fill: SOURCE_FILLS[s.name] || "#9CA3AF",
  }));
  const topProducts: { name: string; value: number; fill: string }[] = [];
  const campaignROI = data?.campaignPerformance || [];

  if (loading) {
    return (
      <div>
        <PageHeader title="Executive Dashboard" description="High-level business metrics for owners and managers" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => <LoadingSkeleton key={i} variant="kpi" />)}
        </div>
      </div>
    );
  }
  return (
    <div>
      <PageHeader
        title="Executive Dashboard"
        description="High-level business metrics for owners and managers"
      />

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard title="Total Revenue" value={`₹${((kpis.totalRevenue || 0) / 100000).toFixed(1)}L`} icon={IndianRupee} />
        <KpiCard title="Conversion Rate" value={`${kpis.conversionRate || 0}%`} icon={TrendingUp} />
        <KpiCard title="Pipeline Value" value={`₹${((kpis.pipelineValue || 0) / 10000000).toFixed(1)} Cr`} icon={Target} />
        <KpiCard title="Total Calls" value={(kpis.totalCalls || 0).toLocaleString("en-IN")} icon={Phone} />
        <KpiCard title="Campaign ROI" value={`${kpis.campaignROI || 0}x`} icon={Megaphone} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly · Jan–Jun 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" tickFormatter={(v: any) => `₹${(Number(v) / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: any) => [`₹${(Number(v) / 100000).toFixed(1)}L`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#16A34A" fill="#DCFCE7" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Pipeline</CardTitle>
            <CardDescription>Current stage distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16A34A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lead Source Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Source</CardTitle>
            <CardDescription>Where leads come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leadSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {leadSourceData.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Most inquired products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6B7280" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#6B7280" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {topProducts.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={PRODUCT_FILLS[idx % PRODUCT_FILLS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign ROI Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign ROI</CardTitle>
          <CardDescription>Last 30 days performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[#E5E7EB]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Calls</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Leads</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Conv %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {campaignROI.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-[#111827]">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-[#111827]">{row.calls}</td>
                    <td className="px-4 py-3 text-sm text-[#111827]">{row.leads}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-semibold ${row.conversion >= 7 ? "text-[#16A34A]" : "text-[#CA8A04]"}`}>
                        {row.conversion}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
