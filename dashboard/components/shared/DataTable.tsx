"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Column<T> {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  onRowClick?: (row: T) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = "id",
  onRowClick,
  page,
  totalPages,
  onPageChange,
  className,
  emptyMessage = "No data found",
}: DataTableProps<T>) {
  return (
    <div className={cn("rounded-xl border border-[#E5E7EB] bg-white overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-[#E5E7EB]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wider",
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-[#6B7280]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row[keyField] ?? Math.random()}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors",
                    onRowClick && "cursor-pointer hover:bg-[#F8FAF7]"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-3 text-sm text-[#111827]", col.className)}
                    >
                      {col.cell ? col.cell(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {page !== undefined && totalPages !== undefined && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] bg-gray-50">
          <span className="text-sm text-[#6B7280]">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
