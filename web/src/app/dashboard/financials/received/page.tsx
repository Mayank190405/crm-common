"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ReceivedPaymentsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPayments() {
            try {
                const res = await api.get("/financials/payments/all");
                if (res.ok) {
                    const data = await res.json();
                    data.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
                    setPayments(data);
                }
            } catch (e) {
                console.error("Failed to load global financials", e);
            } finally {
                setLoading(false);
            }
        }
        loadPayments();
    }, []);

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                Confirmed Receipts (Realized Assets)
            </h2>

            {loading ? (
                <p className="text-sm text-slate-400">Loading master ledger...</p>
            ) : payments.length === 0 ? (
                <p className="text-sm text-slate-400 italic bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center">No receipts recorded yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Transaction REF</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Mode</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Amount Verified</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Execution Date</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Booking / Customer</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((p, idx) => (
                                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4 font-bold text-indigo-800 text-sm whitespace-nowrap">{p.transaction_reference}</td>
                                    <td className="py-4 px-4 font-bold text-slate-500 text-xs whitespace-nowrap">{p.payment_mode}</td>
                                    <td className="py-4 px-4 font-black text-emerald-600 text-sm whitespace-nowrap">₹{(p.amount_paid || 0).toLocaleString()}</td>
                                    <td className="py-4 px-4 font-bold text-slate-600 text-sm whitespace-nowrap">{new Date(p.payment_date).toLocaleDateString()}</td>
                                    <td className="py-4 px-4">
                                        <div className="text-xs font-black text-indigo-600">BOK-{p.booking_id}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-400">{p.customer_name} (Unit {p.unit_id})</div>
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
