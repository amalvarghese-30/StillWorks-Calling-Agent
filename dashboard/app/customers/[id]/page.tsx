"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/shared/StatusBadge";
import LeadScoreBadge from "@/components/shared/LeadScoreBadge";
import DataTable from "@/components/shared/DataTable";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Globe,
  Tractor,
  Sprout,
  Users,
  FileText,
  Clock,
  PhoneIncoming,
  PhoneOutgoing,
  CalendarDays as Calendar,
  PhoneCall,
  CalendarPlus,
  Megaphone,
} from "lucide-react";
import DialerModal from "@/components/DialerModal";

interface Customer {
  id: string;
  name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  address?: string;
  district?: string;
  state?: string;
  language_preference?: string;
  customer_type?: string;
}

interface Call {
  id: string;
  call_id?: string;
  direction: string;
  duration_seconds: number;
  outcome?: string;
  lead_score?: number;
  summary?: string;
  phone_number?: string;
  created_at: string;
}

interface Quote {
  id: string;
  quote_id?: string;
  brand?: string;
  model?: string;
  total_price?: number;
  status: string;
  valid_until?: string;
  created_at: string;
  customer_name?: string;
}

interface Appointment {
  id: string;
  booking_ref?: string;
  type: string;
  product_model?: string;
  date?: string;
  time_slot?: string;
  status: string;
  created_at: string;
}

interface LeadData {
  id: string;
  lead_score?: number;
  product_of_interest?: string;
  budget_min?: number;
  budget_max?: number;
  purchase_timeline?: string;
}

interface CallMemoryData {
  farm_size?: string;
  crops?: string;
  equipment?: string[];
  soil_type?: string;
  irrigation?: string;
  additional_info?: any;
}

type ActivityItem = {
  type: "call" | "quote" | "appointment" | "escalation";
  date: string;
  title: string;
  subtitle: string;
  status?: string;
  score?: number;
};

const LANGUAGE_LABELS: Record<string, string> = {
  ml: "Malayalam",
  en: "English",
  hi: "Hindi",
};

const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞",
  quote: "📄",
  appointment: "📅",
  escalation: "⚠️",
};

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [lead, setLead] = useState<LeadData | null>(null);
  const [callMemory, setCallMemory] = useState<CallMemoryData | null>(null);
  const [timeline, setTimeline] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialerOpen, setDialerOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        if (!res.ok) throw new Error("Customer not found");
        const data = await res.json();

        setCustomer(data.customer);
        setCalls(data.calls || []);
        setQuotes(data.quotes || []);
        setAppointments(data.appointments || []);
        setLead(data.lead || null);
        setCallMemory(data.callMemory || null);

        // Build activity timeline
        const activities: ActivityItem[] = [];
        (data.calls || []).forEach((c: Call) => {
          activities.push({
            type: "call",
            date: c.created_at,
            title: `${c.direction === "inbound" ? "Inbound" : "Outbound"} Call`,
            subtitle: c.summary || c.outcome || "Call completed",
            status: c.outcome,
            score: c.lead_score,
          });
        });
        (data.quotes || []).forEach((q: Quote) => {
          activities.push({
            type: "quote",
            date: q.created_at,
            title: `Quote ${q.quote_id || ""}`,
            subtitle: `${q.brand || ""} ${q.model || ""} — ₹${q.total_price?.toLocaleString("en-IN") || "—"}`,
            status: q.status,
          });
        });
        (data.appointments || []).forEach((a: Appointment) => {
          activities.push({
            type: "appointment",
            date: a.created_at,
            title: `${a.type || "Service"} Appointment`,
            subtitle: a.product_model || a.booking_ref || "",
            status: a.status,
          });
        });
        activities.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTimeline(activities);
      } catch (err) {
        console.error("Failed to fetch customer data:", err);
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    }
    if (customerId) fetchData();
  }, [customerId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="table" rows={4} />
      </div>
    );
  }

  if (!customer) {
    return (
      <EmptyState
        icon={Users}
        title="Customer not found"
        description="The customer profile you're looking for doesn't exist."
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#111827]">{customer.name || "Unknown"}</h1>
            {calls.length > 0 && calls[0].lead_score != null && (
              <LeadScoreBadge score={calls[0].lead_score || 0} />
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-[#6B7280] mt-1">
            <span>{customer.customer_type || "Customer"}</span>
            <span>·</span>
            <span>{customer.district || "Kerala"}{customer.state ? `, ${customer.state}` : ""}</span>
          </div>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#111827]">{customer.phone || "—"}</span>
            </div>
            {customer.alternate_phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-[#6B7280]" />
                <span className="text-[#111827]">{customer.alternate_phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-[#6B7280]" />
                <span className="text-[#111827]">{customer.email}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#111827]">
                {[customer.address, customer.district, customer.state].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Globe className="w-4 h-4 text-[#6B7280]" />
              <span className="text-[#111827]">
                {LANGUAGE_LABELS[customer.language_preference || ""] || customer.language_preference || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Farm & Equipment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Farm & Equipment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {callMemory ? (
              <>
                {callMemory.farm_size && (
                  <div className="flex items-center gap-3 text-sm">
                    <Sprout className="w-4 h-4 text-[#6B7280]" />
                    <span className="text-[#111827]">Farm Size: {callMemory.farm_size}</span>
                  </div>
                )}
                {callMemory.crops && (
                  <div className="flex items-center gap-3 text-sm">
                    <Sprout className="w-4 h-4 text-[#6B7280]" />
                    <span className="text-[#111827]">Crops: {Array.isArray(callMemory.crops) ? callMemory.crops.join(", ") : callMemory.crops}</span>
                  </div>
                )}
                {callMemory.soil_type && (
                  <div className="flex items-center gap-3 text-sm">
                    <Sprout className="w-4 h-4 text-[#6B7280]" />
                    <span className="text-[#111827]">Soil: {callMemory.soil_type}</span>
                  </div>
                )}
                {callMemory.irrigation && (
                  <div className="flex items-center gap-3 text-sm">
                    <Sprout className="w-4 h-4 text-[#6B7280]" />
                    <span className="text-[#111827]">Irrigation: {callMemory.irrigation}</span>
                  </div>
                )}
                {callMemory.equipment && (
                  <div className="flex items-start gap-3 text-sm">
                    <Tractor className="w-4 h-4 text-[#6B7280] shrink-0 mt-0.5" />
                    <span className="text-[#111827]">
                      Equipment: {Array.isArray(callMemory.equipment) ? callMemory.equipment.join(", ") : callMemory.equipment}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <Sprout className="w-4 h-4 text-[#6B7280]" />
                  <span className="text-[#6B7280]">No farm data captured yet</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Tractor className="w-4 h-4 text-[#6B7280]" />
                  <span className="text-[#6B7280]">No equipment data captured yet</span>
                </div>
              </>
            )}
            <p className="text-xs text-[#9CA3AF] mt-2">
              Farm size, crops, and equipment data are automatically captured from voice conversations and stored in call memory.
            </p>
          </CardContent>
        </Card>

        {/* Lead Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead ? (
              <>
                {lead.lead_score != null && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#6B7280]">Score</span>
                      <LeadScoreBadge score={lead.lead_score} />
                    </div>
                    <Separator />
                  </>
                )}
                {lead.product_of_interest && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Product Interest</span>
                    <span className="text-sm font-medium text-[#111827]">{lead.product_of_interest}</span>
                  </div>
                )}
                {lead.budget_min != null && lead.budget_max != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Budget</span>
                    <span className="text-sm font-medium text-[#111827]">₹{lead.budget_min.toLocaleString("en-IN")} – ₹{lead.budget_max.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {lead.purchase_timeline && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B7280]">Timeline</span>
                    <span className="text-sm font-medium text-[#111827]">{lead.purchase_timeline}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[#9CA3AF]">
                No lead data yet. Lead information is captured during voice calls.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={() => setDialerOpen(true)}
              className="bg-[#16A34A] hover:bg-[#15803D]"
            >
              <PhoneCall className="w-4 h-4 mr-2" />
              Call Now
            </Button>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Generate Quote
            </Button>
            <Button variant="outline">
              <CalendarPlus className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            <Button variant="outline">
              <Megaphone className="w-4 h-4 mr-2" />
              Start Follow-up
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Calls */}
      {calls.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Recent Calls ({calls.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#E5E7EB]">
              {calls.slice(0, 5).map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    {call.direction === "inbound" ? (
                      <PhoneIncoming className="w-4 h-4 text-[#16A34A] shrink-0" />
                    ) : (
                      <PhoneOutgoing className="w-4 h-4 text-[#CA8A04] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#111827]">
                        {call.summary || call.outcome || call.direction === "inbound" ? "Inbound Call" : "Outbound Call"}
                      </p>
                      <p className="text-xs text-[#6B7280]">
                        {call.created_at
                          ? new Date(call.created_at).toLocaleString("en-IN")
                          : "—"}
                        {call.duration_seconds ? ` · ${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {call.lead_score != null && <LeadScoreBadge score={call.lead_score} />}
                    {call.outcome && <StatusBadge status={call.outcome} />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline + Details */}
      <Tabs defaultValue="timeline" className="mb-6">
        <TabsList>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="calls">Calls ({calls.length})</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Customer Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="No activity yet"
                  description="Activity from calls, quotes, and appointments will appear here."
                />
              ) : (
                <div className="relative pl-6 border-l-2 border-[#E5E7EB] space-y-6">
                  {timeline.map((item, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-white border-2 border-[#16A34A]" />
                      <div className="text-xs text-[#6B7280] mb-1">
                        {item.date
                          ? new Date(item.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{ACTIVITY_ICONS[item.type] || "•"}</span>
                        <span className="font-medium text-[#111827]">{item.title}</span>
                        {item.status && <StatusBadge status={item.status} />}
                        {item.score != null && <LeadScoreBadge score={item.score} />}
                      </div>
                      {item.subtitle && (
                        <p className="text-sm text-[#6B7280] mt-1 ml-7">{item.subtitle}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  {
                    key: "created_at",
                    header: "Time",
                    cell: (row: Call) => (
                      <span className="text-xs text-[#6B7280]">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString("en-IN")
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
                    key: "summary",
                    header: "Summary",
                    cell: (row: Call) => (
                      <span className="text-sm">{row.summary || row.outcome || "—"}</span>
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
                    key: "lead_score",
                    header: "Score",
                    cell: (row: Call) =>
                      row.lead_score != null ? (
                        <LeadScoreBadge score={row.lead_score} />
                      ) : (
                        "—"
                      ),
                  },
                ]}
                data={calls}
                keyField="id"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardContent className="p-0">
              {quotes.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={FileText}
                    title="No quotes yet"
                    description="Quotes generated during calls will appear here."
                  />
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {quotes.map((q) => (
                    <div key={q.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#111827]">{q.quote_id || q.id}</p>
                          <p className="text-sm text-[#6B7280]">
                            {q.brand} {q.model} — ₹{q.total_price?.toLocaleString("en-IN") || "—"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#6B7280]">
                            {q.valid_until ? `Valid until ${new Date(q.valid_until).toLocaleDateString("en-IN")}` : ""}
                          </span>
                          <StatusBadge status={q.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardContent className="p-0">
              {appointments.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Calendar}
                    title="No appointments"
                    description="Appointments booked during calls will appear here."
                  />
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {appointments.map((a) => (
                    <div key={a.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#111827]">{a.type || "Service"} Appointment</p>
                          <p className="text-sm text-[#6B7280]">
                            {a.product_model || a.booking_ref || "—"} · {a.date ? new Date(a.date).toLocaleDateString("en-IN") : "—"} {a.time_slot || ""}
                          </p>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DialerModal
        open={dialerOpen}
        onOpenChange={setDialerOpen}
        initialPhone={customer?.phone || ""}
        initialName={customer?.name || ""}
      />
    </div>
  );
}

