"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ProjectPerformanceReport() {
    const [performance, setPerformance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPerformance() {
            try {
                const res = await api.get("/reports/project-performance");
                if (res.ok) setPerformance(await res.json());
            } catch (err) {
                console.error("Failed to load project report", err);
            } finally {
                setLoading(false);
            }
        }
        fetchPerformance();
    }, []);

    if (loading) return <div className="p-8 text-slate-400">Loading intelligence summary...</div>;

    // Find top performer for visual highlighting
    const topPerformerId = performance.length > 0 ? performance[0].project_id : null;

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                Project Velocity Matrix
            </h2>

            {performance.length === 0 ? (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-6 rounded-xl border border-dashed text-center">No projects detected.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Rank</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Project</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Units Cleared</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Realized Contract Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {performance.map((p, idx) => (
                                <tr key={p.project_id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${p.project_id === topPerformerId ? 'bg-emerald-50/30' : ''}`}>
                                    <td className="py-4 px-4 font-black text-slate-300 text-sm">#{idx + 1}</td>
                                    <td className="py-4 px-4">
                                        <div className="font-black text-indigo-900 text-sm flex items-center gap-2">
                                            {p.project_name}
                                            {p.project_id === topPerformerId && <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Top Performer</span>}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 font-bold text-slate-600 text-sm">{p.units_sold} Units</td>
                                    <td className="py-4 px-4 font-black text-emerald-600 text-sm">₹{p.total_revenue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
