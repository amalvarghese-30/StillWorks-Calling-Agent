"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/shared/StatusBadge";
import LeadScoreBadge from "@/components/shared/LeadScoreBadge";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import {
  Phone,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Calendar,
  MessageSquare,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";

interface CallDetail {
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
  created_at?: string;
}

interface CallMemoryData {
  summary?: string;
  transcript?: string;
  memory_json?: string;
  lead_score?: number;
  outcome?: string;
}

interface CallDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string | null;
}

export default function CallDetailDrawer({ open, onOpenChange, callId }: CallDetailDrawerProps) {
  const [call, setCall] = useState<CallDetail | null>(null);
  const [callMemory, setCallMemory] = useState<CallMemoryData | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [escalation, setEscalation] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!callId || !open) return;
    setLoading(true);
    fetch(`/api/calls/${callId}`)
      .then((res) => res.json())
      .then((data) => {
        setCall(data.call);
        setCallMemory(data.callMemory);
        setQuote(data.quote);
        setEscalation(data.escalation);
        setAppointments(data.appointments || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [callId, open]);

  const parseMemoryJson = () => {
    if (!callMemory?.memory_json) return null;
    try {
      return typeof callMemory.memory_json === "string"
        ? JSON.parse(callMemory.memory_json)
        : callMemory.memory_json;
    } catch {
      return null;
    }
  };

  const farmData = parseMemoryJson();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        {loading ? (
          <div className="py-8">
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="table" rows={4} />
          </div>
        ) : !call ? (
          <div className="py-12 text-center text-[#6B7280]">Call not found</div>
        ) : (
          <>
            <SheetHeader className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                {call.direction === "inbound" ? (
                  <PhoneIncoming className="w-5 h-5 text-[#16A34A]" />
                ) : (
                  <PhoneOutgoing className="w-5 h-5 text-[#CA8A04]" />
                )}
                <SheetTitle className="text-lg">
                  {call.customer_name || call.phone_number || "Unknown Caller"}
                </SheetTitle>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Phone className="w-3 h-3" />
                {call.phone_number || "—"}
                <span className="text-[#D1D5DB]">|</span>
                <Clock className="w-3 h-3" />
                {call.created_at
                  ? new Date(call.created_at).toLocaleString("en-IN")
                  : "—"}
              </div>
            </SheetHeader>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="text-xs text-[#6B7280]">Duration</div>
                <div className="font-semibold text-sm">
                  {call.duration_seconds
                    ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                    : "—"}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="text-xs text-[#6B7280]">Status</div>
                <StatusBadge status={call.status} />
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="text-xs text-[#6B7280]">Score</div>
                {call.lead_score != null ? (
                  <LeadScoreBadge score={call.lead_score} />
                ) : (
                  <span className="text-sm text-[#6B7280]">—</span>
                )}
              </div>
            </div>

            <Tabs defaultValue="summary">
              <TabsList className="w-full">
                <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                <TabsTrigger value="transcript" className="flex-1">Transcript</TabsTrigger>
                <TabsTrigger value="customer" className="flex-1">Customer</TabsTrigger>
                <TabsTrigger value="actions" className="flex-1">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4 mt-4">
                <div>
                  <h4 className="text-sm font-semibold text-[#111827] mb-1">Call Summary</h4>
                  <p className="text-sm text-[#4B5563]">
                    {call.summary || callMemory?.summary || "No summary recorded"}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[#6B7280]">Direction</span>
                    <p className="font-medium text-[#111827] capitalize">{call.direction}</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Call Type</span>
                    <p className="font-medium text-[#111827] capitalize">
                      {(call.call_type || "—").replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Language</span>
                    <p className="font-medium text-[#111827]">
                      {call.language_used?.toUpperCase() || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#6B7280]">Outcome</span>
                    <p className="font-medium text-[#111827] capitalize">
                      {(call.outcome || "—").replace(/_/g, " ")}
                    </p>
                  </div>
                </div>

                {quote && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold text-[#111827] mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#16A34A]" />
                        Quote Generated
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                        <p><span className="text-[#6B7280]">Quote:</span> {quote.quote_id || quote.id}</p>
                        <p><span className="text-[#6B7280]">Model:</span> {quote.brand} {quote.model}</p>
                        <p><span className="text-[#6B7280]">Price:</span> ₹{quote.total_price?.toLocaleString("en-IN")}</p>
                        <StatusBadge status={quote.status} />
                      </div>
                    </div>
                  </>
                )}

                {escalation && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold text-[#111827] mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#CA8A04]" />
                        Escalation
                      </h4>
                      <div className="bg-amber-50 rounded-lg p-3 space-y-1 text-sm">
                        <p><span className="text-[#6B7280]">Tier:</span> {escalation.tier}</p>
                        <p><span className="text-[#6B7280]">Reason:</span> {escalation.reason}</p>
                        {escalation.action_taken && (
                          <p><span className="text-[#6B7280]">Action:</span> {escalation.action_taken}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="mt-4">
                {callMemory?.transcript ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-[#4B5563] whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                    {typeof callMemory.transcript === "string"
                      ? callMemory.transcript
                      : JSON.stringify(callMemory.transcript, null, 2)}
                  </div>
                ) : (
                  <div className="py-12 text-center text-[#6B7280]">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#D1D5DB]" />
                    No transcript available for this call
                  </div>
                )}
              </TabsContent>

              <TabsContent value="customer" className="space-y-4 mt-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                    <User className="w-5 h-5 text-[#16A34A]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#111827]">
                      {call.customer_name || "Unknown"}
                    </p>
                    <p className="text-sm text-[#6B7280]">{call.phone_number}</p>
                  </div>
                </div>

                {farmData && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-[#111827]">Farm Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {farmData.farm_size && (
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-[#6B7280]">Farm Size</span>
                          <p className="font-medium">{farmData.farm_size}</p>
                        </div>
                      )}
                      {farmData.soil_type && (
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-[#6B7280]">Soil Type</span>
                          <p className="font-medium">{farmData.soil_type}</p>
                        </div>
                      )}
                      {farmData.irrigation && (
                        <div className="bg-gray-50 rounded p-2">
                          <span className="text-[#6B7280]">Irrigation</span>
                          <p className="font-medium">{farmData.irrigation}</p>
                        </div>
                      )}
                    </div>
                    {farmData.crops && (
                      <div className="bg-gray-50 rounded p-2 text-sm">
                        <span className="text-[#6B7280]">Crops</span>
                        <p className="font-medium">
                          {Array.isArray(farmData.crops) ? farmData.crops.join(", ") : farmData.crops}
                        </p>
                      </div>
                    )}
                    {farmData.equipment && (
                      <div className="bg-gray-50 rounded p-2 text-sm">
                        <span className="text-[#6B7280]">Equipment</span>
                        <p className="font-medium">
                          {Array.isArray(farmData.equipment) ? farmData.equipment.join(", ") : farmData.equipment}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {appointments.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold text-[#111827] mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#16A34A]" />
                        Appointments ({appointments.length})
                      </h4>
                      {appointments.map((a) => (
                        <div key={a.id} className="bg-gray-50 rounded p-2 mb-2 text-sm">
                          <p className="font-medium">{a.model || a.product_model || "Service"}</p>
                          <p className="text-[#6B7280]">
                            {a.preferred_date || a.date} · {a.time_slot}
                          </p>
                          <StatusBadge status={a.status} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="actions" className="space-y-3 mt-4">
                <Button className="w-full bg-[#16A34A] hover:bg-[#15803D]" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Again
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Quote
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
                <Button variant="outline" className="w-full text-[#CA8A04]" size="sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Escalate
                </Button>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
