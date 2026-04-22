"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function FinancialsDashboard() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState({
        amount_paid: "",
        transaction_reference: "",
        payment_mode: "BANK_TRANSFER",
        payment_schedule_id: ""
    });

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) setCurrentUser(JSON.parse(userStr));

        async function loadData() {
            try {
                const res = await api.get("/bookings");
                if (res.ok) {
                    const allBookings = await res.json();
                    // Filter out drafts or rejected for financials
                    const valid = allBookings.filter((b: any) =>
                        ['accounts_verified', 'admin_confirmed', 'SOLD', 'Accounts Verified', 'Admin Confirmed'].includes(b.status)
                    );
                    setBookings(valid);
                }
            } catch (err) {
                console.error("Failed to load ledgers", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const fetchFinancials = async (booking: any) => {
        setSelectedBooking(booking);
        try {
            const [schedRes, payRes] = await Promise.all([
                api.get(`/financials/booking/${booking.id}/schedules`),
                api.get(`/financials/booking/${booking.id}/payments`)
            ]);

            if (schedRes.ok) setSchedules(await schedRes.json());
            if (payRes.ok) setPayments(await payRes.json());
        } catch (err) {
            alert("Error loading financial telemetry");
        }
    };

    const handleLogPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const amount = parseFloat(paymentData.amount_paid);
            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid payment amount.");
                return;
            }

            const payload = {
                booking_id: selectedBooking.id,
                amount_paid: amount,
                transaction_reference: paymentData.transaction_reference,
                payment_mode: paymentData.payment_mode,
                ...(paymentData.payment_schedule_id ? { payment_schedule_id: parseInt(paymentData.payment_schedule_id) } : {})
            };

            setSubmitting(true);
            const res = await api.post("/financials/payments", payload);
            if (res.ok) {
                alert("PAYMENT VERIFIED: Ledger updated.");
                setShowPaymentModal(false);
                setPaymentData({ amount_paid: "", transaction_reference: "", payment_mode: "BANK_TRANSFER", payment_schedule_id: "" });
                fetchFinancials(selectedBooking); // Reload
            } else {
                const err = await res.json();
                alert(`Transaction Rejected: ${err.detail}`);
            }
        } catch (err) {
            alert("Protocol failure processing payment");
        } finally {
            setSubmitting(false);
        }
    };

    const totalExpected = selectedBooking ? selectedBooking.total_cost : 0;
    const totalReceived = payments.reduce((acc, p) => acc + p.amount_paid, 0);
    const totalPending = totalExpected - totalReceived;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Financial Ledger</h1>
                    <p className="text-slate-500">Master Settlement Operations & Compliance</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Accounts Block */}
                <div className="lg:col-span-1 border-r border-slate-200 pr-4 max-h-[80vh] overflow-y-auto">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 sticky top-0 bg-slate-50 py-2">Active Property Accounts</h3>
                    {loading ? (
                        <p className="text-sm text-slate-400">Synchronizing ledgers...</p>
                    ) : bookings.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No verfied accounts found.</p>
                    ) : (
                        <div className="space-y-3">
                            {bookings.map(b => (
                                <div
                                    key={b.id}
                                    onClick={() => fetchFinancials(b)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedBooking?.id === b.id ? 'bg-indigo-600 border-indigo-700 shadow-lg shadow-indigo-100' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className={`text-[9px] font-black uppercase tracking-tighter truncate ${selectedBooking?.id === b.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                            {b.unit?.floor?.tower?.project?.name || "Project"} • BOK-{b.id} • UNIT {b.unit?.unit_number || b.unit_id}
                                        </p>
                                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 ml-2 ${selectedBooking?.id === b.id ? 'bg-indigo-500 text-white' : 'bg-green-100 text-green-700'}`}>Secured</span>
                                    </div>
                                    <p className={`text-sm font-bold truncate ${selectedBooking?.id === b.id ? 'text-white' : 'text-slate-800'}`}>{b.customer?.full_name || "Direct Customer"}</p>
                                    <p className={`text-[10px] font-black mt-1 ${selectedBooking?.id === b.id ? 'text-indigo-200' : 'text-slate-500'}`}>₹{(b.total_cost || 0).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Telemetry View */}
                <div className="lg:col-span-2">
                    {!selectedBooking ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                            <span className="text-5xl mb-4">🏛️</span>
                            <p className="font-bold">Select an account to view financial telemetry</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Master Summary */}
                            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Matrix</h3>
                                        <div className="flex items-center space-x-2 mt-2">
                                            <span className="text-white font-bold text-sm tracking-tight">{selectedBooking.unit?.floor?.tower?.project?.name || "Premium Project"}</span>
                                            <span className="text-slate-500 text-[10px] font-black">•</span>
                                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Agent: {selectedBooking.created_by?.full_name || "Master Console"}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-indigo-400 uppercase">Unit {selectedBooking.unit?.unit_number}</p>
                                        <p className="text-xs font-bold text-slate-200">{selectedBooking.customer?.full_name}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="pb-4 border-b border-slate-700">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Contract Value</p>
                                        <p className="text-2xl font-black mt-1">₹{(totalExpected || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="pb-4 border-b border-slate-700">
                                        <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Realized Assets</p>
                                        <p className="text-2xl font-black mt-1 text-emerald-400">₹{(totalReceived || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="pb-4 border-b border-slate-700">
                                        <p className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">Unrealized Receivables</p>
                                        <p className="text-2xl font-black mt-1 text-orange-400">₹{(totalPending || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-between items-center">
                                    <div className="text-xs font-bold text-slate-400">
                                        Funding Model: Bank <span className="text-white">₹{(selectedBooking.bank_loan_amount || 0).toLocaleString()}</span> • Self <span className="text-white">₹{(selectedBooking.own_contribution_amount || 0).toLocaleString()}</span>
                                    </div>
                                    {currentUser?.role !== 'sales_agent' && (
                                        <button
                                            onClick={() => setShowPaymentModal(true)}
                                            className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg"
                                        >
                                            Process Payment
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Milestone Engine */}
                                <div className="bg-white border text-left border-slate-100 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Milestone Engine</h3>
                                    <div className="space-y-3">
                                        {schedules.length === 0 ? <p className="text-xs italic text-slate-400">No milestones registered.</p> :
                                            schedules.map(ms => (
                                                <div key={ms.id} className={`p-4 rounded-xl border ${ms.is_paid ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <p className={`text-xs font-black uppercase ${ms.is_paid ? 'text-emerald-700' : 'text-slate-800'}`}>{ms.milestone}</p>
                                                        {ms.is_paid ? (
                                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded">Settled</span>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pending</span>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-lg font-black text-slate-700">₹{(ms.amount || 0).toLocaleString()}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Due: {new Date(ms.due_date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>

                                {/* Transaction Log */}
                                <div className="bg-white border text-left border-slate-100 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Transaction Receipts</h3>
                                    <div className="space-y-3">
                                        {payments.length === 0 ? <p className="text-xs italic text-slate-400">No transactions recorded.</p> :
                                            payments.map(p => (
                                                <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                        T
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-black text-slate-800 uppercase">REF: {p.transaction_reference}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(p.payment_date).toLocaleDateString()} • {p.payment_mode}</p>
                                                    </div>
                                                    <p className="text-sm font-black text-emerald-600">₹{(p.amount_paid || 0).toLocaleString()}</p>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase">Process Transaction</h2>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Executing securely for Ledger BOK-{selectedBooking?.id}</p>
                            </div>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleLogPayment} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Map to Milestone (Optional)</label>
                                <select
                                    value={paymentData.payment_schedule_id}
                                    onChange={(e) => setPaymentData({ ...paymentData, payment_schedule_id: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700"
                                >
                                    <option value="">-- Apply Generic Overpayment --</option>
                                    {schedules.filter(s => !s.is_paid).map(s => (
                                        <option key={s.id} value={s.id}>{s.milestone} • Pending: ₹{(s.amount || 0).toLocaleString()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount Realized</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            required
                                            value={paymentData.amount_paid ? new Intl.NumberFormat('en-IN').format(parseFloat(paymentData.amount_paid.replace(/,/g, ''))) : ""}
                                            onChange={(e) => {
                                                const raw = e.target.value.replace(/,/g, '');
                                                const clean = raw.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '');
                                                setPaymentData({ ...paymentData, amount_paid: clean });
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 pl-8 pr-4 py-3 rounded-2xl text-sm font-black text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Enter amount"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Mode</label>
                                    <select
                                        value={paymentData.payment_mode}
                                        onChange={(e) => setPaymentData({ ...paymentData, payment_mode: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-700"
                                    >
                                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                                        <option value="CHEQUE">Corporate Cheque</option>
                                        <option value="DD">Demand Draft</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Reference (UTR / Cheque No)</label>
                                <input
                                    type="text"
                                    required
                                    value={paymentData.transaction_reference}
                                    onChange={(e) => setPaymentData({ ...paymentData, transaction_reference: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Enter reference ID"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 disabled:bg-indigo-300 shadow-xl shadow-indigo-100 uppercase tracking-widest transition-all mt-4"
                                disabled={submitting}
                            >
                                {submitting ? "Processing Transaction..." : "Secure Transaction"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
