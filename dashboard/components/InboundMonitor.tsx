"use client";

import { useState, useEffect, useCallback } from 'react';
import { Phone, Clock, Loader2, RefreshCw, Headphones } from 'lucide-react';

interface ActiveCall {
  roomName: string;
  phoneNumber: string;
  status: string;
  language: string;
  duration: string;
  createdAt: string;
}

export default function InboundMonitor() {
    const [calls, setCalls] = useState<ActiveCall[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchCalls = useCallback(async () => {
        try {
            const res = await fetch('/api/calls?direction=inbound&status=initiated,answered&limit=20');
            if (res.ok) {
                const data = await res.json();
                setCalls(data.calls || []);
                setError('');
            } else {
                setError('Failed to fetch calls');
            }
        } catch {
            setError('API unavailable — agent may not be running');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCalls();
        const interval = setInterval(fetchCalls, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [fetchCalls]);

    const languageLabel = (code: string) => {
        switch (code) {
            case 'ml': return 'Malayalam';
            case 'hi': return 'Hindi';
            case 'en': return 'English';
            default: return code || '—';
        }
    };

    return (
        <div className="relative group w-full max-w-4xl">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl opacity-50 blur-lg"></div>
            <div className="relative p-8 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center gap-3">
                        <Headphones className="w-6 h-6 text-cyan-400" /> Active Calls
                    </h2>
                    <button
                        onClick={fetchCalls}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-gray-500">
                        <Headphones className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{error}</p>
                        <p className="text-xs mt-1">Start the agent to see active calls</p>
                    </div>
                ) : calls.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No active inbound calls</p>
                        <p className="text-xs mt-1">Waiting for incoming calls...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {calls.map((call, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${call.status === 'answered' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                                    <div>
                                        <p className="text-white font-medium font-mono">{call.phoneNumber}</p>
                                        <p className="text-xs text-gray-500">{call.roomName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {call.duration || '0s'}
                                    </span>
                                    <span className="px-2 py-1 rounded-full bg-white/5 text-xs text-gray-300">
                                        {languageLabel(call.language)}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        call.status === 'answered' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                        {call.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
