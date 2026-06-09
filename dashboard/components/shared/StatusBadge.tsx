import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  // Call statuses
  initiated: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  ringing: "bg-blue-50 text-blue-700 border-blue-200",
  answered: "bg-green-50 text-green-700 border-green-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  transferred: "bg-yellow-50 text-yellow-700 border-yellow-200",
  no_answer: "bg-red-50 text-red-700 border-red-200",
  hung_up: "bg-red-50 text-red-700 border-red-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  busy: "bg-red-50 text-red-700 border-red-200",
  // Lead statuses
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  qualified: "bg-green-50 text-green-700 border-green-200",
  demo_scheduled: "bg-yellow-50 text-yellow-700 border-yellow-200",
  negotiation: "bg-orange-50 text-orange-700 border-orange-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-red-50 text-red-700 border-red-200",
  // Appointment statuses
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-green-50 text-green-700 border-green-200",
  booked: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  // Escalation statuses
  resolved: "bg-green-50 text-green-700 border-green-200",
  // Quote statuses
  draft: "bg-gray-50 text-gray-700 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  initiated: "Initiated",
  in_progress: "In Progress",
  ringing: "Ringing",
  answered: "Answered",
  completed: "Completed",
  transferred: "Transferred",
  no_answer: "No Answer",
  hung_up: "Hung Up",
  failed: "Failed",
  busy: "Busy",
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  demo_scheduled: "Demo Scheduled",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  pending: "Pending",
  confirmed: "Confirmed",
  booked: "Booked",
  cancelled: "Cancelled",
  resolved: "Resolved",
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] || status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const style = STATUS_STYLES[status] || "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <Badge variant="outline" className={cn(style, "border", className)}>
      {label}
    </Badge>
  );
}
