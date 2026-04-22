"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function EmployeePerformanceReport() {
    const [performance, setPerformance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPerformance() {
            try {
                const res = await api.get("/reports/employee-performance");
                if (res.ok) setPerformance(await res.json());
            } catch (err) {
                console.error("Failed to load employee report", err);
            } finally {
                setLoading(false);
            }
        }
        fetchPerformance();
    }, []);

    if (loading) return <div className="p-8 text-slate-400">Loading intelligence summary...</div>;

    // Calculate dynamic boundaries for highlighting
    const highestConv = Math.max(...performance.map(p => p.conversion_rate), 0.1); // Avoid div zero logic
    const topPerformerId = performance.length > 0 ? performance[0].employee_id : null;

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                Employee Value Creation Matrix
            </h2>

            {performance.length === 0 ? (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-6 rounded-xl border border-dashed text-center">No agent data detected.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Rank</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Sales Representative</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Pipeline Acquired</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Deals Closed</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Conversion Rate</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Total Revenue Generated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {performance.map((p, idx) => {
                                const isWarning = p.conversion_rate < 5 && p.total_leads_assigned > 10;
                                return (
                                    <tr key={p.employee_id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${p.employee_id === topPerformerId ? 'bg-indigo-50/30' : ''} ${isWarning ? 'bg-red-50/20' : ''}`}>
                                        <td className="py-4 px-4 font-black text-slate-300 text-sm">#{idx + 1}</td>
                                        <td className="py-4 px-4">
                                            <div className="font-black text-slate-800 text-sm flex items-center gap-2">
                                                {p.employee_name}
                                                {p.employee_id === topPerformerId && <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">Rainmaker</span>}
                                                {isWarning && <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-red-100 text-red-600">Needs Review</span>}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 font-bold text-slate-600 text-sm">{p.total_leads_assigned} Leads</td>
                                        <td className="py-4 px-4 font-bold text-slate-600 text-sm">{p.total_bookings_closed} Bookings</td>
                                        <td className="py-4 px-4 font-black">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-24">
                                                    <div className={`h-full ${isWarning ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(p.conversion_rate, 100)}%` }}></div>
                                                </div>
                                                <span className={`text-[10px] ${isWarning ? 'text-red-600' : 'text-emerald-600'}`}>{p.conversion_rate}%</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 font-black text-indigo-700 text-lg">₹{p.total_revenue_generated.toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
