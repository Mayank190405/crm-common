"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SummaryReportPage() {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSummary() {
            try {
                const res = await api.get("/reports/summary");
                if (res.ok) setSummary(await res.json());
            } catch (err) {
                console.error("Failed to load summary", err);
            } finally {
                setLoading(false);
            }
        }
        fetchSummary();
    }, []);

    if (loading) return <div className="p-8 text-slate-400">Loading intelligence summary...</div>;
    if (!summary) return <div className="p-8 text-slate-400">No data available.</div>;

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                Executive Summary
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1 relative z-10">Sales Funnel</p>
                    <p className="text-4xl font-black text-slate-900 relative z-10">{summary.leads?.total || 0}</p>
                    <p className="text-sm font-bold text-slate-500 mt-2 relative z-10">Total Pipeline Leads</p>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1 relative z-10">Revenue Cycle</p>
                    <p className="text-4xl font-black text-slate-900 relative z-10">{summary.bookings?.total_confirmed || 0}</p>
                    <p className="text-sm font-bold text-slate-500 mt-2 relative z-10">Confirmed Bookings</p>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                    <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1 relative z-10">Inventory Saturation</p>
                    <div className="mt-2 space-y-1 relative z-10">
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-slate-500">Available:</span>
                            <span className="text-slate-900">{summary.inventory?.available || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-amber-600">Locked / Transit:</span>
                            <span>{summary.inventory?.blocked || 0}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-emerald-600">Sold:</span>
                            <span>{summary.inventory?.sold || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
