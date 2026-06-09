"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";

interface Customer {
  id: string;
  name: string;
  phone: string;
  alternate_phone?: string;
  email?: string;
  district?: string;
  state?: string;
  language_preference?: string;
  customer_type?: string;
  created_at: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  ml: "Malayalam",
  en: "English",
  hi: "Hindi",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        const res = await fetch(`/api/customers?${params}`);
        const data = await res.json();
        setCustomers(data.customers || []);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const columns = [
    {
      key: "name",
      header: "Name",
      cell: (row: Customer) => (
        <div className="font-medium text-[#111827]">{row.name || "—"}</div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      cell: (row: Customer) => (
        <span className="text-[#111827]">{row.phone || "—"}</span>
      ),
    },
    {
      key: "district",
      header: "District",
      cell: (row: Customer) => (
        <span className="text-[#6B7280]">{row.district || "—"}</span>
      ),
    },
    {
      key: "language_preference",
      header: "Language",
      cell: (row: Customer) => (
        <span className="text-xs font-medium text-[#6B7280]">
          {LANGUAGE_LABELS[row.language_preference || ""] || row.language_preference || "—"}
        </span>
      ),
    },
    {
      key: "customer_type",
      header: "Type",
      cell: (row: Customer) => (
        <StatusBadge status={row.customer_type || ""} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage all customer profiles"
      >
        <Button size="sm" asChild>
          <Link href="/customers/new">
            <Plus className="w-4 h-4" />
            Add Customer
          </Link>
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Districts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Districts</SelectItem>
            <SelectItem value="Palakkad">Palakkad</SelectItem>
            <SelectItem value="Thrissur">Thrissur</SelectItem>
            <SelectItem value="Malappuram">Malappuram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Customer profiles will appear here after calls are processed."
        />
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          keyField="id"
          onRowClick={(row) => window.location.href = `/customers/${row.id}`}
        />
      )}
    </div>
  );
}
