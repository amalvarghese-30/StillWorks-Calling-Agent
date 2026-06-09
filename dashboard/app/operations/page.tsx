"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Phone, PhoneIncoming, PhoneOutgoing, CheckCircle, ArrowUpRight,
  FileText, Users, Megaphone, Activity, Server, Cpu, Database,
  RefreshCw, AlertTriangle, TrendingUp, Clock, MessageSquare,
} from "lucide-react";

interface OpsData {
  calls: {
    total: number; inbound: number; outbound: number; today: number;
    todayInbound: number; answered: number; transferred: number;
    failed: number; answerRate: number; transferRate: number;
    failureRate: number; avgDuration: number;
  };
  quotes: { total: number; accepted: number; conversionRate: number };
  leads: { total: number; qualified: number; qualificationRate: number };
  campaigns: { total: number; active: number };
  escalations: { total: number };
  webhooks: { total: number; failures: number };
  system: { dbBackend: string; llmProvider: string; ttsProvider: string; sttProvider: string };
}

export default function OperationsDashboard() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/operations");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const healthColor = (rate: number, threshold = 70) =>
    rate >= threshold ? "text-green-600" : rate >= 50 ? "text-amber-600" : "text-red-600";

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Operations Observability</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time platform health and performance metrics
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* System Info Bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Database", value: data.system.dbBackend, icon: Database },
          { label: "LLM", value: data.system.llmProvider, icon: Cpu },
          { label: "TTS", value: data.system.ttsProvider, icon: Activity },
          { label: "STT", value: data.system.sttProvider, icon: Server },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
          >
            <item.icon className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-[10px] uppercase text-gray-400 font-semibold tracking-wide">
                {item.label}
              </div>
              <div className="text-sm font-semibold text-gray-700 capitalize">
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Call Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-green-600" />
          Call Center Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Calls", value: data.calls.total, icon: Phone },
            { label: "Inbound", value: data.calls.inbound, icon: PhoneIncoming },
            { label: "Outbound", value: data.calls.outbound, icon: PhoneOutgoing },
            { label: "Today", value: data.calls.today, icon: Clock },
            { label: "Answered", value: data.calls.answered, icon: CheckCircle },
            { label: "Transferred", value: data.calls.transferred, icon: ArrowUpRight },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <m.icon className="w-4 h-4 text-gray-400 mb-2" />
              <div className="text-2xl font-bold text-gray-800">{m.value}</div>
              <div className="text-xs text-gray-500">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {[
            { label: "Answer Rate", value: `${data.calls.answerRate}%`, color: healthColor(data.calls.answerRate) },
            { label: "Transfer Rate", value: `${data.calls.transferRate}%`, color: "text-amber-600" },
            { label: "Failure Rate", value: `${data.calls.failureRate}%`, color: data.calls.failureRate > 20 ? "text-red-600" : "text-green-600" },
            { label: "Avg Duration", value: `${data.calls.avgDuration}s`, color: "text-gray-700" },
          ].map((m) => (
            <div
              key={m.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
              <div className="text-xs text-gray-500">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quotes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            Quotes
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-3xl font-bold text-gray-800">{data.quotes.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-700">{data.quotes.accepted}</div>
              <div className="text-xs text-gray-500">Accepted</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Conversion</span>
            <span className={`font-bold ${data.quotes.conversionRate >= 30 ? "text-green-600" : "text-amber-600"}`}>
              {data.quotes.conversionRate}%
            </span>
          </div>
          <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(data.quotes.conversionRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Leads */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Leads
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-3xl font-bold text-gray-800">{data.leads.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-700">{data.leads.qualified}</div>
              <div className="text-xs text-gray-500">Qualified</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Qualification</span>
            <span className={`font-bold ${healthColor(data.leads.qualificationRate)}`}>
              {data.leads.qualificationRate}%
            </span>
          </div>
          <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(data.leads.qualificationRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-green-600" />
            Campaigns
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-3xl font-bold text-gray-800">{data.campaigns.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-700">{data.campaigns.active}</div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Escalations</span>
              <span className={data.escalations.total > 0 ? "text-red-600 font-semibold" : "text-gray-700"}>
                {data.escalations.total}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Webhook Events</span>
              <span className="text-gray-700">{data.webhooks.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Webhook Failures</span>
              <span className={data.webhooks.failures > 0 ? "text-red-600 font-semibold" : "text-gray-700"}>
                {data.webhooks.failures}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          System Health Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthCard
            label="Call Success"
            value={`${data.calls.answerRate}%`}
            status={data.calls.answerRate >= 70 ? "healthy" : data.calls.answerRate >= 50 ? "warning" : "critical"}
          />
          <HealthCard
            label="Quote Conversion"
            value={`${data.quotes.conversionRate}%`}
            status={data.quotes.conversionRate >= 30 ? "healthy" : data.quotes.conversionRate >= 15 ? "warning" : "critical"}
          />
          <HealthCard
            label="Lead Quality"
            value={`${data.leads.qualificationRate}%`}
            status={data.leads.qualificationRate >= 40 ? "healthy" : data.leads.qualificationRate >= 20 ? "warning" : "critical"}
          />
          <HealthCard
            label="Active Campaigns"
            value={String(data.campaigns.active)}
            status={data.campaigns.active > 0 ? "healthy" : "warning"}
          />
        </div>
      </div>
    </div>
  );
}

function HealthCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "healthy" | "warning" | "critical";
}) {
  const colors = {
    healthy: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    critical: "bg-red-50 border-red-200",
  };
  const dots = {
    healthy: "bg-green-500",
    warning: "bg-amber-500",
    critical: "bg-red-500",
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[status]}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${dots[status]}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          {status}
        </span>
      </div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
