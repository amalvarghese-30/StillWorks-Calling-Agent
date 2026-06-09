"use client";

import { useState, useEffect, useCallback } from 'react';
import { Settings, Loader2, RefreshCw, Search } from 'lucide-react';

interface Booking {
  id: number;
  booking_ref: string;
  customer_name: string;
  phone: string;
  model: string;
  issue_description: string;
  service_type: string;
  preferred_date: string;
  time_slot: string;
  status: string;
  location: string;
  created_at: string;
}

export default function ServiceBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    const fetchBookings = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filter) params.set('status', filter);
            if (search) params.set('search', search);
            const res = await fetch(`/api/service-bookings?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings || []);
                setError('');
            }
        } catch {
            setError('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const statusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            in_progress: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            completed: 'bg-green-500/10 text-green-400 border-green-500/20',
            cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        return colors[status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    const serviceTypeLabel = (type: string) => {
        return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return (
        <div className="w-full max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Settings className="w-6 h-6 text-manas-green" /> Service Bookings
                </h2>
                <button onClick={fetchBookings} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by phone or booking ref..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-manas-green"
                    />
                </div>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-manas-green"
                >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
                </div>
            ) : error ? (
                <div className="text-center py-12 text-gray-500">{error}</div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No service bookings yet</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 text-gray-400 text-left">
                            <tr>
                                <th className="p-3 font-medium">Ref</th>
                                <th className="p-3 font-medium">Customer</th>
                                <th className="p-3 font-medium">Phone</th>
                                <th className="p-3 font-medium">Model</th>
                                <th className="p-3 font-medium">Type</th>
                                <th className="p-3 font-medium">Date</th>
                                <th className="p-3 font-medium">Slot</th>
                                <th className="p-3 font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {bookings.map((b) => (
                                <tr key={b.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-mono text-manas-green">{b.booking_ref}</td>
                                    <td className="p-3 text-white">{b.customer_name}</td>
                                    <td className="p-3 font-mono text-gray-400">{b.phone}</td>
                                    <td className="p-3 text-gray-300">{b.model}</td>
                                    <td className="p-3 text-gray-400">{serviceTypeLabel(b.service_type)}</td>
                                    <td className="p-3 text-gray-300">{b.preferred_date}</td>
                                    <td className="p-3 text-gray-400">{b.time_slot}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs border ${statusColor(b.status)}`}>
                                            {b.status.replace('_', ' ')}
                                        </span>
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
