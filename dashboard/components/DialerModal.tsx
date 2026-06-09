"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface DialerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPhone?: string;
  initialName?: string;
}

const REASONS = [
  { value: "service_reminder", label: "Service Reminder" },
  { value: "emi_followup", label: "EMI Follow-up" },
  { value: "demo_reminder", label: "Demo Reminder" },
  { value: "quote_followup", label: "Quote Follow-up" },
  { value: "product_inquiry", label: "Product Inquiry" },
  { value: "payment_followup", label: "Payment Follow-up" },
  { value: "custom", label: "Custom Reason" },
];

export default function DialerModal({ open, onOpenChange, initialPhone = "", initialName = "" }: DialerModalProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState(initialName);
  const [language, setLanguage] = useState("ml");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const resetForm = () => {
    setPhone(initialPhone);
    setName(initialName);
    setLanguage("ml");
    setReason("");
    setCustomReason("");
    setResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const startCall = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const finalReason = reason === "custom" ? customReason : REASONS.find(r => r.value === reason)?.label || reason;
      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          customerName: name,
          language,
          reason: finalReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: `Call dispatched to ${phone}` });
      } else {
        setResult({ success: false, message: data.error || "Failed to start call" });
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-[#16A34A]" />
            Call Now
          </DialogTitle>
          <DialogDescription>Start an outbound call to a customer</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#111827]">Phone Number *</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#111827]">Customer Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#111827]">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ml">Malayalam</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">Hindi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#111827]">Reason for Calling</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === "custom" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#111827]">Custom Reason</label>
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the reason for calling..."
                className="h-20"
              />
            </div>
          )}

          {result && (
            <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
              result.success ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-red-50 text-red-700"
            }`}>
              {result.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              {result.message}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={startCall}
            disabled={loading || !phone.trim()}
            className="bg-[#16A34A] hover:bg-[#15803D]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Start Call
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
