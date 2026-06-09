"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/shared/DataTable";
import KpiCard from "@/components/shared/KpiCard";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSkeleton from "@/components/shared/LoadingSkeleton";
import { Package, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface Product {
  id: string;
  brand: string;
  model: string;
  category: string;
  subcategory?: string;
  horse_power?: number;
  approximate_price_min?: number;
  approximate_price_max?: number;
  status?: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [kpis, setKpis] = useState({ totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/inventory");
        const data = await res.json();
        setProducts(data.products || []);
        setKpis(data.kpis || { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
      } catch (err) {
        console.error("Failed to fetch inventory:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const inStock = kpis.inStock;
  const lowStock = kpis.lowStock;
  const outOfStock = kpis.outOfStock;

  const statusBadge = (status?: string) => {
    switch (status) {
      case "in_stock":
        return <Badge variant="success">In Stock</Badge>;
      case "low_stock":
        return <Badge variant="warning">Low Stock</Badge>;
      case "out_of_stock":
        return <Badge variant="destructive">Out of Stock</Badge>;
      default:
        return "—";
    }
  };

  const columns = [
    { key: "brand", header: "Brand", cell: (row: Product) => <span className="font-medium">{row.brand}</span> },
    { key: "model", header: "Model", cell: (row: Product) => <span>{row.model}</span> },
    { key: "category", header: "Category", cell: (row: Product) => <span className="text-[#6B7280]">{row.category}</span> },
    {
      key: "approximate_price_max",
      header: "Price Range",
      cell: (row: Product) => (
        <span className="text-sm">
          ₹{row.approximate_price_min?.toLocaleString("en-IN") || "—"} – ₹{row.approximate_price_max?.toLocaleString("en-IN") || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: Product) => statusBadge(row.status),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Product stock levels and availability"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Products" value={products.length} icon={Package} />
        <KpiCard title="In Stock" value={inStock} icon={CheckCircle} />
        <KpiCard title="Low Stock" value={lowStock} icon={AlertTriangle} />
        <KpiCard title="Out of Stock" value={outOfStock} icon={XCircle} />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="in_stock">In Stock</TabsTrigger>
          <TabsTrigger value="low_stock">Low Stock</TabsTrigger>
          <TabsTrigger value="out_of_stock">Out of Stock</TabsTrigger>
        </TabsList>
        {loading ? (
          <div className="p-6"><LoadingSkeleton rows={5} /></div>
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="No products" description="Inventory data will appear here once synced." />
        ) : (
          ["all", "in_stock", "low_stock", "out_of_stock"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <DataTable
                columns={columns}
                data={
                  tab === "all"
                    ? products
                    : products.filter((p) => p.status === tab)
                }
                keyField="id"
              />
            </TabsContent>
          ))
        )}
      </Tabs>
    </div>
  );
}
