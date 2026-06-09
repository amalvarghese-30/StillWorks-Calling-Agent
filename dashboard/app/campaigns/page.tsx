"use client";

import { useEffect, useState, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/shared/StatusBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import KpiCard from "@/components/shared/KpiCard";
import {
  Megaphone,
  Phone,
  Loader2,
  Calendar,
  BadgeDollarSign,
  UserCheck,
  Upload,
  Play,
  Pause,
  Square,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

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
  no_answer_count?: number;
  escalated_count?: number;
  csv_filename?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface CampaignPerformance {
  totalCampaigns: number;
  callsDispatched: number;
  answeredRate: number;
  leadsGenerated: number;
}

const TEMPLATES = [
  {
    id: "service_reminder",
    title: "Service Reminder",
    icon: Calendar,
    description: "Remind customers about upcoming periodic servicing",
    prompt: "Your tractor is due for periodic service. Inform the customer and offer to book a service appointment.",
    language: "ml",
    color: "from-[#16A34A] to-emerald-600",
    iconColor: "text-[#16A34A]",
  },
  {
    id: "follow_up",
    title: "Sales Follow-up",
    icon: UserCheck,
    description: "Follow up on previous inquiries",
    prompt: "Follow up on the customer's previous inquiry. Ask if they have questions or want a demo.",
    language: "ml",
    color: "from-[#2563EB] to-blue-700",
    iconColor: "text-[#2563EB]",
  },
  {
    id: "promotional",
    title: "Promotional Offer",
    icon: Megaphone,
    description: "Inform about seasonal discounts",
    prompt: "AgriForge has a special offer. Present the offer and ask if interested.",
    language: "ml",
    color: "from-[#CA8A04] to-amber-600",
    iconColor: "text-[#CA8A04]",
  },
  {
    id: "payment_followup",
    title: "EMI Reminder",
    icon: BadgeDollarSign,
    description: "Follow up on EMI payments",
    prompt: "Call regarding the financing. Be discreet and polite.",
    language: "ml",
    color: "from-purple-500 to-pink-600",
    iconColor: "text-purple-500",
  },
];

export default function CampaignsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [numbers, setNumbers] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [perf, setPerf] = useState<CampaignPerformance>({ totalCampaigns: 0, callsDispatched: 0, answeredRate: 0, leadsGenerated: 0 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setPerf(data.performance || { totalCampaigns: 0, callsDispatched: 0, answeredRate: 0, leadsGenerated: 0 });
      setCampaigns(data.campaigns || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const template = TEMPLATES.find((t) => t.id === selectedTemplate);

  const launchCampaign = async () => {
    if (!template) return;
    const numberList = numbers
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (numberList.length === 0) return;

    setSending(true);
    setResult("");
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numbers: numberList,
          prompt: template.prompt,
          campaignType: template.id,
          language: template.language,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const dispatched = data.results?.filter((r: any) => r.status === "dispatched").length || 0;
        setResult(`Campaign launched! ${dispatched}/${numberList.length} calls dispatched.`);
        fetchData();
      } else {
        setResult(`Error: ${data.error || "Unknown error"}`);
      }
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvUploading(true);
    setCsvResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.csv$/i, ""));
      formData.append("campaignType", "csv_upload");
      formData.append("language", "ml");

      const res = await fetch("/api/campaigns/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setCsvResult({ success: true, message: `Campaign created with ${data.entriesCount} numbers` });
        fetchData();
      } else {
        setCsvResult({ success: false, message: data.error || "Upload failed" });
      }
    } catch (e: any) {
      setCsvResult({ success: false, message: e.message });
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [executingId, setExecutingId] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<string>("");

  const updateCampaignStatus = async (campaignId: string, newStatus: string) => {
    if (newStatus === "running") {
      setExecutingId(campaignId);
      setExecResult("Dispatching calls...");
    }
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.execution) {
        setExecResult(`${data.execution.dispatched} dispatched, ${data.execution.failed} failed of ${data.execution.total} calls`);
      }
      await fetchData();
      setTimeout(() => { setExecResult(""); setExecutingId(null); }, 3000);
    } catch (err) {
      console.error("Error updating campaign:", err);
      setExecResult("Failed to execute campaign");
      setExecutingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campaigns" description="Launch outbound calling campaigns" />
        <LoadingSkeleton variant="kpi" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Campaigns" description="Launch outbound calling campaigns" />

      {/* Campaign Performance KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Campaigns" value={perf.totalCampaigns} icon={Megaphone} />
        <KpiCard title="Calls Dispatched" value={perf.callsDispatched} icon={Phone} />
        <KpiCard title="Answered Rate" value={perf.answeredRate ? `${perf.answeredRate}%` : "—"} icon={Phone} />
        <KpiCard title="Leads Generated" value={perf.leadsGenerated} icon={UserCheck} />
      </div>

      {/* Campaign List */}
      {campaigns.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#16A34A]" />
              All Campaigns
            </CardTitle>
            <CardDescription>{campaigns.length} campaigns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.map((c) => {
              const progress = c.numbers_count > 0
                ? Math.round(((c.processed_count || c.calls_dispatched || 0) / c.numbers_count) * 100)
                : 0;
              return (
                <div key={c.id} className="border border-[#E5E7EB] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[#111827]">{c.name}</h4>
                      <p className="text-xs text-[#6B7280] capitalize">
                        {c.campaign_type.replace(/_/g, " ")}
                        {c.csv_filename && <span className="ml-2">· {c.csv_filename}</span>}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-[#16A34A] h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span>{c.processed_count || c.calls_dispatched || 0} / {c.numbers_count} processed</span>
                    <span>{progress}%</span>
                  </div>

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-gray-50 rounded p-1.5">
                      <div className="text-[#6B7280]">Answered</div>
                      <div className="font-semibold text-[#111827]">{c.answered_calls || 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <div className="text-[#6B7280]">No Answer</div>
                      <div className="font-semibold text-[#111827]">{c.no_answer_count || 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <div className="text-[#6B7280]">Leads</div>
                      <div className="font-semibold text-[#16A34A]">{c.leads_generated || 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <div className="text-[#6B7280]">Appts</div>
                      <div className="font-semibold text-[#2563EB]">{c.appointments_created || 0}</div>
                    </div>
                  </div>

                  {/* Campaign Controls */}
                  <div className="flex items-center gap-2">
                    {c.id === executingId && (
                      <span className="text-xs text-[#6B7280] flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Dispatching...
                      </span>
                    )}
                    {c.status === "draft" && c.id !== executingId && (
                      <Button size="sm" className="h-8 bg-[#16A34A] hover:bg-[#15803D]"
                        onClick={() => updateCampaignStatus(c.id, "running")}>
                        <Play className="w-3 h-3 mr-1" /> Start
                      </Button>
                    )}
                    {c.status === "running" && (
                      <>
                        <Button size="sm" variant="outline" className="h-8"
                          onClick={() => updateCampaignStatus(c.id, "paused")}>
                          <Pause className="w-3 h-3 mr-1" /> Pause
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 text-red-600"
                          onClick={() => updateCampaignStatus(c.id, "completed")}>
                          <Square className="w-3 h-3 mr-1" /> Stop
                        </Button>
                      </>
                    )}
                    {c.status === "paused" && (
                      <Button size="sm" className="h-8 bg-[#16A34A] hover:bg-[#15803D]"
                        onClick={() => updateCampaignStatus(c.id, "running")}>
                        <Play className="w-3 h-3 mr-1" /> Resume
                      </Button>
                    )}
                    {c.started_at && (
                      <span className="text-xs text-[#6B7280] ml-auto">
                        Started {new Date(c.started_at).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                  {execResult && c.id === executingId && (
                    <div className="mt-2 p-2 rounded bg-[#DCFCE7] text-xs text-[#16A34A]">
                      {execResult}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          const isSelected = selectedTemplate === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t.id);
                setNumbers("");
                setResult("");
              }}
              className={`text-left p-5 rounded-xl border transition-all ${
                isSelected
                  ? "border-[#16A34A] bg-[#DCFCE7] ring-1 ring-[#16A34A]"
                  : "border-[#E5E7EB] bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${isSelected ? "bg-[#16A34A]/10" : "bg-gray-50"}`}>
                  <Icon className={`w-5 h-5 ${t.iconColor}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#111827]">{t.title}</h3>
                  <p className="text-xs text-[#6B7280] mt-1">{t.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* CSV Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4 text-[#2563EB]" />
              CSV Upload
            </CardTitle>
            <CardDescription>Upload a CSV with name, phone, language, reason columns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="block w-full text-sm text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#DCFCE7] file:text-[#16A34A] hover:file:bg-[#BBF7D0]"
            />
            {csvUploading && (
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </div>
            )}
            {csvResult && (
              <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                csvResult.success ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-red-50 text-red-700"
              }`}>
                {csvResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                {csvResult.message}
              </div>
            )}
            <div className="text-xs text-[#9CA3AF]">
              <p className="font-medium mb-1">Expected columns:</p>
              <code className="bg-gray-50 px-2 py-0.5 rounded text-[#6B7280]">
                name,phone,language,reason
              </code>
              <p className="mt-1">phone and reason are required.</p>
            </div>
          </CardContent>
        </Card>

        {/* Manual Launch Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="w-4 h-4 text-[#CA8A04]" />
              Manual Entry
            </CardTitle>
            <CardDescription>Enter phone numbers directly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={numbers}
              onChange={(e) => setNumbers(e.target.value)}
              placeholder="+919876543210&#10;+919988776655"
              className="font-mono text-sm h-20"
            />
            {template && (
              <Button onClick={launchCampaign} disabled={sending || !numbers.trim()} className="w-full">
                {sending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Launching...</>
                ) : (
                  <><Megaphone className="w-4 h-4" /> Launch {template.title}</>
                )}
              </Button>
            )}
            {!template && (
              <p className="text-xs text-[#9CA3AF] text-center">
                Select a campaign template above first
              </p>
            )}
            {result && (
              <div className={`p-3 rounded-lg text-sm ${
                result.startsWith("Error")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-[#DCFCE7] text-[#16A34A] border border-[#DCFCE7]"
              }`}>
                {result}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Analytics */}
      {campaigns.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4 mt-8">
            <BarChart3 className="w-5 h-5 text-[#16A34A]" />
            <h2 className="text-lg font-semibold text-[#111827]">Campaign Analytics</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Campaign Performance Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Performance</CardTitle>
                <CardDescription>Calls dispatched, answered, and leads by campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={campaigns.slice(0, 8).map(c => ({
                    name: c.name.length > 15 ? c.name.slice(0, 15) + "..." : c.name,
                    Dispatched: c.calls_dispatched || c.numbers_count || 0,
                    Answered: c.answered_calls || 0,
                    Leads: c.leads_generated || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <Tooltip />
                    <Bar dataKey="Dispatched" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Answered" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Leads" fill="#CA8A04" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Answer Rate Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Answer Rate</CardTitle>
                <CardDescription>Answered vs No Answer across all campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Answered", value: campaigns.reduce((s, c) => s + (c.answered_calls || 0), 0) },
                        { name: "No Answer", value: campaigns.reduce((s, c) => s + (c.no_answer_count || 0), 0) },
                        { name: "Pending", value: campaigns.reduce((s, c) => s + Math.max(0, (c.numbers_count || 0) - (c.processed_count || c.calls_dispatched || 0)), 0) },
                      ].filter(d => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#16A34A" />
                      <Cell fill="#CA8A04" />
                      <Cell fill="#9CA3AF" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lead Generation Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Generation</CardTitle>
                <CardDescription>Leads generated per campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={campaigns.slice(0, 8).map(c => ({
                    name: c.name.length > 12 ? c.name.slice(0, 12) + "..." : c.name,
                    Leads: c.leads_generated || 0,
                    Appointments: c.appointments_created || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} />
                    <Tooltip />
                    <Bar dataKey="Leads" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Appointments" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Campaign ROI Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign ROI</CardTitle>
                <CardDescription>Efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#DCFCE7] rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#16A34A]">
                      {campaigns.reduce((s, c) => s + (c.calls_dispatched || c.numbers_count || 0), 0)}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1">Total Calls</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#CA8A04]">
                      {campaigns.reduce((s, c) => s + (c.leads_generated || 0), 0)}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1">Total Leads</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#2563EB]">
                      {perf.answeredRate}%
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1">Answer Rate</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-[#111827]">
                      {campaigns.length}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-1">Campaigns</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {campaigns.filter(c => (c.leads_generated || 0) > 0).slice(0, 5).map(c => {
                    const costPerLead = (c.calls_dispatched || c.numbers_count || 1) / Math.max(c.leads_generated || 1, 1);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-sm">
                        <span className="text-[#6B7280] truncate max-w-[200px]">{c.name}</span>
                        <span className="font-medium text-[#111827]">{costPerLead.toFixed(1)} calls/lead</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
