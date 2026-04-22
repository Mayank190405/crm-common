"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function BookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadBookings() {
            try {
                const res = await api.get("/bookings");
                if (res.ok) {
                    setBookings(await res.json());
                }
            } catch (err) {
                console.error("Failed to load bookings", err);
            } finally {
                setLoading(false);
            }
        }
        loadBookings();
    }, []);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "Draft": return "bg-slate-100 text-slate-600";
            case "Pending Verification": return "bg-orange-100 text-orange-700";
            case "Accounts Verified": return "bg-blue-100 text-blue-700";
            case "Admin Confirmed": return "bg-green-100 text-green-700";
            case "Rejected": return "bg-red-100 text-red-700";
            case "Cancelled": return "bg-slate-200 text-slate-400";
            default: return "bg-slate-100 text-slate-600";
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Booking Pipeline</h1>
                    <p className="text-slate-500">Manage unit bookings and verification status.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Customer & Property</th>
                                <th className="px-6 py-4">Financials</th>
                                <th className="px-6 py-4">Funding & Terms</th>
                                <th className="px-6 py-4">Current Status</th>
                                <th className="px-6 py-4">Created On</th>
                                <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-20 text-slate-400">Loading bookings...</td></tr>
                            ) : bookings.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-20 text-slate-400">No active bookings found.</td></tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-slate-900 text-lg">
                                                {booking.customer?.full_name || booking.lead?.full_name || "N/A"}
                                            </p>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded leading-none">BOK-{booking.id}</span>
                                                <span className="text-xs text-indigo-600 font-bold uppercase transition-all">
                                                    Unit {booking.unit?.unit_number} • {booking.unit?.floor?.tower?.project?.name || "Project"}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest leading-none bg-slate-50 px-2 py-1 inline-block rounded">
                                                Sales Agent: {booking.created_by?.full_name || "Direct Console"}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold text-slate-800">₹{(booking.total_cost || 0).toLocaleString()}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Self: ₹{(booking.own_contribution_amount || 0).toLocaleString()}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Bank: ₹{(booking.bank_loan_amount || 0).toLocaleString()}</p>
                                                <div className="flex gap-1 overflow-hidden mt-1">
                                                    {[...Array(booking.payment_schedules?.length || 0)].map((_, i) => (
                                                        <div key={i} className="w-1 h-3 bg-indigo-100 rounded-full" title={`Milestone ${i+1}`}></div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${getStatusStyle(booking.status)}`}>
                                                {booking.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-slate-500">{new Date(booking.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}</td>
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                                            >
                                                Manage Details →
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
