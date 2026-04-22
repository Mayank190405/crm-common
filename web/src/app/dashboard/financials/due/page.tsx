"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DuePaymentsPage() {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSchedules() {
            try {
                const res = await api.get("/financials/schedules/all");
                if (res.ok) {
                    const data = await res.json();
                    const now = new Date();
                    // Due: Not paid, and due date is in the future (or today)
                    const due = data.filter((s: any) => !s.is_paid && new Date(s.due_date) >= now);
                    // Sort by earliest due date
                    due.sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
                    setSchedules(due);
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
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                Upcoming Due Payments
            </h2>

            {loading ? (
                <p className="text-sm text-slate-400">Loading master ledger...</p>
            ) : schedules.length === 0 ? (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center">No upcoming due payments.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Milestone</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Amount Due</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Due Date</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Booking / Customer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {schedules.map((s, idx) => (
                                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4 font-bold text-slate-800 text-sm whitespace-nowrap">{s.milestone}</td>
                                    <td className="py-4 px-4 font-black text-amber-600 text-sm whitespace-nowrap">₹{(s.amount || 0).toLocaleString()}</td>
                                    <td className="py-4 px-4 font-bold text-slate-600 text-sm whitespace-nowrap">{new Date(s.due_date).toLocaleDateString()}</td>
                                    <td className="py-4 px-4">
                                        <div className="text-xs font-black text-indigo-600">BOK-{s.booking_id}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">{s.customer_name} (Unit {s.unit_id})</div>
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
