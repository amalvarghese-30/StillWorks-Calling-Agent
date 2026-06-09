"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { FileText, IndianRupee } from "lucide-react";

interface Quote {
  id: string;
  quote_id?: string;
  customer_name?: string;
  phone?: string;
  brand?: string;
  model?: string;
  total_price?: number;
  ex_showroom_price?: number;
  financing_options_json?: string;
  valid_until?: string;
  status: string;
  created_at: string;
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/quotes");
        const data = await res.json();
        setQuotes(data.quotes || []);
      } catch (err) {
        console.error("Failed to fetch quotes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="Manage price quotes generated during calls"
      />

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><LoadingSkeleton rows={4} /></div>
              ) : quotes.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={FileText}
                    title="No quotes yet"
                    description="Price quotes generated during voice conversations will appear here with full pricing breakdowns and financing options."
                  />
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7EB]">
                  {quotes.map((q) => (
                    <div key={q.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-[#111827]">
                            {q.quote_id || "—"}
                          </p>
                          <p className="text-sm text-[#6B7280]">
                            {q.customer_name} · {q.brand} {q.model}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#111827] flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {q.total_price?.toLocaleString("en-IN") || "—"}
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
        {["draft", "sent", "accepted"].map((tab) => {
          const filtered = quotes.filter((q) => q.status === tab);
          return (
            <TabsContent key={tab} value={tab}>
              {loading ? (
                <div className="p-6"><LoadingSkeleton rows={4} /></div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={FileText} title={`No ${tab} quotes`} />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-[#E5E7EB]">
                      {filtered.map((q) => (
                        <div key={q.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-[#111827]">{q.quote_id || "—"}</p>
                              <p className="text-sm text-[#6B7280]">
                                {q.customer_name} · {q.brand} {q.model}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-[#111827] flex items-center gap-1">
                                <IndianRupee className="w-3 h-3" />
                                {q.total_price?.toLocaleString("en-IN") || "—"}
                              </span>
                              <StatusBadge status={q.status} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
