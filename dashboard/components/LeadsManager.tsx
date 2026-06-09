"use client";

import { useState, useEffect, useCallback } from 'react';
import { Users, Loader2, RefreshCw, Search } from 'lucide-react';

interface Lead {
  id: number;
  customer_name: string;
  phone: string;
  interest: string;
  product_of_interest: string;
  source: string;
  status: string;
  notes: string;
  created_at: string;
}

export default function LeadsManager() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    const fetchLeads = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filter) params.set('status', filter);
            if (search) params.set('search', search);
            const res = await fetch(`/api/leads?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
                setError('');
            }
        } catch {
            setError('Failed to load leads');
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const updateLeadStatus = async (id: number, newStatus: string) => {
        try {
            await fetch('/api/leads', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus }),
            });
            fetchLeads();
        } catch {
            // ignore
        }
    };

    const statusColor = (status: string) => {
        const colors: Record<string, string> = {
            new: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            contacted: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            qualified: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            converted: 'bg-green-500/10 text-green-400 border-green-500/20',
            lost: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    const interestLabel = (interest: string) => {
        return interest.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Users className="w-6 h-6 text-manas-gold" /> Customers & Leads
                </h2>
                <button onClick={fetchLeads} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-manas-gold"
                    />
                </div>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-manas-gold"
                >
                    <option value="">All Status</option>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
                </div>
            ) : error ? (
                <div className="text-center py-12 text-gray-500">{error}</div>
            ) : leads.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No leads yet</p>
                    <p className="text-xs mt-1">Leads are created when customers inquire about products or services</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 text-gray-400 text-left">
                            <tr>
                                <th className="p-3 font-medium">Customer</th>
                                <th className="p-3 font-medium">Phone</th>
                                <th className="p-3 font-medium">Interest</th>
                                <th className="p-3 font-medium">Product</th>
                                <th className="p-3 font-medium">Source</th>
                                <th className="p-3 font-medium">Date</th>
                                <th className="p-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {leads.map((l) => (
                                <tr key={l.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 text-white">{l.customer_name}</td>
                                    <td className="p-3 font-mono text-gray-400">{l.phone}</td>
                                    <td className="p-3 text-gray-300">{interestLabel(l.interest)}</td>
                                    <td className="p-3 text-gray-400">{l.product_of_interest || '—'}</td>
                                    <td className="p-3 text-gray-400">{l.source.replace('_', ' ')}</td>
                                    <td className="p-3 text-gray-500 text-xs">{l.created_at?.slice(0, 10)}</td>
                                    <td className="p-3">
                                        <select
                                            value={l.status}
                                            onChange={(e) => updateLeadStatus(l.id, e.target.value)}
                                            className={`px-2 py-1 rounded-full text-xs border outline-none cursor-pointer ${statusColor(l.status)}`}
                                        >
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="qualified">Qualified</option>
                                            <option value="converted">Converted</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
