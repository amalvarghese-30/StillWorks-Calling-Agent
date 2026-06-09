"use client";

import { useState } from 'react';
import { Users, FileText, Loader2, CheckCircle, AlertCircle, Download, Globe } from 'lucide-react';

const CAMPAIGN_TYPES = [
  { value: 'service_reminder', label: 'Service Reminder' },
  { value: 'follow_up', label: 'Follow-up Call' },
  { value: 'promotional', label: 'Promotional Offer' },
  { value: 'payment_followup', label: 'Payment Follow-up' },
];

const LANGUAGES = [
  { value: 'ml', label: 'Malayalam' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
];

export default function BulkDialer() {
    const [input, setInput] = useState('');
    const [prompt, setPrompt] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [results, setResults] = useState<any[]>([]);

    const handleBulkDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setResults([]);

        const form = e.target as HTMLFormElement;
        const campaignType = (form.elements.namedItem('campaignType') as HTMLSelectElement).value;
        const language = (form.elements.namedItem('language') as HTMLSelectElement).value;

        const numbers = input.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);

        if (numbers.length === 0) {
            setStatus('error');
            return;
        }

        try {
            const res = await fetch('/api/queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numbers, prompt, campaignType, language }),
            });

            const data = await res.json();
            setResults(data.results || []);

            if (res.ok) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (err: any) {
            setStatus('error');
        }
    };

    const downloadTemplate = () => {
        const csv = 'phone,name,model,campaign_type,notes\n+919876543210,Rajappan Nair,John Deere 5045D,service_reminder,500-hour service due\n+919988776655,Moidu,Cultivator,follow_up,Inquired last week\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'manas_campaign_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="relative group max-w-md w-full">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-manas-gold/80 to-amber-600 rounded-2xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 blur-lg"></div>

            <div className="relative p-8 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-manas-gold to-amber-400">
                        Campaign
                    </h2>
                    <Users className="w-5 h-5 text-manas-gold" />
                </div>

                <form onSubmit={handleBulkDispatch} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
                                <Globe className="w-4 h-4" /> Language
                            </label>
                            <select
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-manas-gold"
                                name="language"
                                defaultValue="ml"
                            >
                                {LANGUAGES.map(l => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 font-medium">Campaign Type</label>
                            <select
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:ring-2 focus:ring-manas-gold"
                                name="campaignType"
                                defaultValue="service_reminder"
                            >
                                {CAMPAIGN_TYPES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" /> Phone Numbers (CSV or Newline)
                            </label>
                            <button
                                type="button"
                                onClick={downloadTemplate}
                                className="text-xs text-manas-gold hover:text-amber-400 flex items-center gap-1 transition-colors"
                            >
                                <Download className="w-3 h-3" /> Template
                            </button>
                        </div>
                        <textarea
                            placeholder="+919876543210&#10;+919988776655&#10;+12125551234"
                            required
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-manas-gold focus:border-transparent text-white placeholder-gray-600 outline-none transition-all duration-300 h-30 resize-none font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 text-right">Separate by comma or new line | <span className="text-manas-gold cursor-pointer hover:underline" onClick={downloadTemplate}>Download template</span></p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-gray-400 font-medium flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Campaign Message
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Your tractor service is due..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-manas-gold focus:border-transparent text-white placeholder-gray-600 outline-none transition-all duration-300"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full py-4 px-6 bg-gradient-to-r from-manas-gold/90 to-amber-600 hover:from-manas-gold hover:to-amber-500 text-black font-bold rounded-xl shadow-lg hover:shadow-manas-gold/25 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                            </>
                        ) : (
                            'Launch Campaign'
                        )}
                    </button>

                    {status === 'success' && (
                        <div className="max-h-48 overflow-y-auto space-y-2 mt-4 custom-scrollbar">
                            <p className="text-xs text-gray-400 mb-1">Dispatched {results.length} calls:</p>
                            {results.map((res, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 text-xs">
                                    <span className="font-mono text-gray-300">{res.phoneNumber}</span>
                                    {res.status === 'dispatched' ? (
                                        <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sent</span>
                                    ) : (
                                        <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="p-3 rounded-xl text-sm text-center bg-red-500/10 text-red-200 border border-red-500/20">
                            Failed to launch campaign. Check server logs.
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
