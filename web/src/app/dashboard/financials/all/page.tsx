"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AllPaymentsPage() {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSchedules() {
            try {
                const res = await api.get("/financials/schedules/all");
                if (res.ok) {
                    const data = await res.json();
                    data.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                    setSchedules(data);
                }
            } catch (e) {
                console.error("Failed to load global financials", e);
            } finally {
                setLoading(false);
            }
        }
        loadSchedules();
    }, []);

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                Master Ledger Matrix
            </h2>

            {loading ? (
                <p className="text-sm text-slate-400">Loading master ledger...</p>
            ) : schedules.length === 0 ? (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center">No payment schedules exist across the network.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Milestone</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Expected Value</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Due Date</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Status</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Booking / Customer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.map((s, idx) => {
                                const isOverdue = !s.is_paid && new Date(s.due_date) < new Date();
                                return (
                                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-4 font-bold text-slate-800 text-sm whitespace-nowrap">{s.milestone}</td>
                                        <td className="py-4 px-4 font-black text-slate-600 text-sm whitespace-nowrap">₹{(s.amount || 0).toLocaleString()}</td>
                                        <td className="py-4 px-4 font-bold text-slate-600 text-sm whitespace-nowrap">{new Date(s.due_date).toLocaleDateString()}</td>
                                        <td className="py-4 px-4 whitespace-nowrap">
                                            {s.is_paid ? (
                                                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase">Settled</span>
                                            ) : isOverdue ? (
                                                <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-black uppercase">Overdue</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-black uppercase">Pending</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="text-xs font-black text-indigo-600">BOK-{s.booking_id}</div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400">{s.customer_name} (Unit {s.unit_id})</div>
                                        </td>
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
