"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [booking, setBooking] = useState<any>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [docType, setDocType] = useState("KYC_PAN");

    const router = useRouter();

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (userStr) setCurrentUser(JSON.parse(userStr));

        async function loadBooking() {
            try {
                const [bookRes, docRes] = await Promise.all([
                    api.get(`/bookings/${id}`),
                    api.get(`/documents/booking/${id}`),
                ]);
                if (bookRes.ok) setBooking(await bookRes.json());
                if (docRes.ok) setDocuments(await docRes.json());
            } catch (err) {
                console.error("Load failed", err);
            } finally {
                setLoading(false);
            }
        }
        loadBooking();
    }, [id]);

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            const res = await api.put(`/bookings/${id}/status?status=${encodeURIComponent(newStatus)}`, {});
            if (res.ok) {
                setBooking({ ...booking, status: newStatus });
                alert(`Booking moved to ${newStatus}`);
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (err) {
            alert("Status update failed");
        }
    };

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", docType);

        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/documents/booking/${id}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData,
            });

            if (res.ok) {
                const newDoc = await res.json();
                setDocuments([...documents, newDoc]);
                setFile(null);
                alert("Document uploaded successfully");
            }
        } catch (err) {
            alert("Upload failed");
        }
    };

    const handlePrint = () => {
        if (!booking) return;

        const customerName = booking.customer?.full_name || booking.lead?.full_name || "N/A";
        const unit = booking.unit;
        const milestones = booking.payment_schedules || [];
        const costItems = booking.cost_items || [];
        const diff = booking.total_cost - (booking.agreement_cost || 0);

        const printContent = `
            <html>
                <head>
                    <title>Booking Voucher - ${customerName}</title>
                    <style>
                        @media print { 
                            .no-print { display: none; } 
                            @page { margin: 10mm; }
                        }
                        body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.3; padding: 0; margin: 0; font-size: 11px; }
                        .header { border-bottom: 2px solid #4338ca; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
                        .section-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-bottom: 8px; margin-top: 15px; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
                        .val { font-weight: 700; color: #0f172a; font-size: 11px; }
                        .label { color: #64748b; font-size: 10px; }
                        .financial-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                        .financial-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
                        .total-row { background: #f8fafc; font-size: 14px; font-weight: 900; color: #4338ca; }
                        .footer { margin-top: 30px; display: flex; justify-content: space-between; }
                        .sig-box { border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 5px; font-size: 9px; font-weight: 900; color: #475569; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1 style="margin: 0; font-size: 22px; color: #4338ca; line-height: 1;">BOOKING CONFIRMATION</h1>
                            <p style="margin: 3px 0 0 0; font-weight: 800; color: #1e293b; font-size: 13px;">${unit?.floor?.tower?.project?.name || "Official Booking Document"}</p>
                        </div>
                        <div style="text-align: right;">
                            <p class="label" style="margin:0;">Date</p>
                            <p class="val" style="margin:0;">${new Date(booking.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                    </div>

                    <div class="section-title">Customer & KYC Details</div>
                    <div class="grid">
                        <div style="display: flex; gap: 20px;">
                            <p><span class="label">Primary Customer:</span> <br/><span class="val">${customerName}</span></p>
                            <p><span class="label">Phone:</span> <br/><span class="val">${booking.customer?.phone || booking.lead?.phone || 'N/A'}</span></p>
                        </div>
                        <div style="display: flex; gap: 20px;">
                            <p><span class="label">Aadhaar:</span> <br/><span class="val">${booking.customer?.aadhaar_number || 'N/A'}</span></p>
                            <p><span class="label">PAN:</span> <br/><span class="val">${booking.customer?.pan_number || 'N/A'}</span></p>
                        </div>
                    </div>

                    <div class="grid" style="margin-top: 10px;">
                        <div style="display: flex; gap: 30px;">
                            <p><span class="label">Project:</span> <br/><span class="val">${unit?.floor?.tower?.project?.name || "N/A"}</span></p>
                            <p><span class="label">Tower / Floor:</span> <br/><span class="val">${unit?.floor?.tower?.name || "N/A"} / ${unit?.floor?.floor_number ?? "N/A"}</span></p>
                            <p><span class="label">Saleable Area:</span> <br/><span class="val">${unit?.saleable_area || "N/A"} Sq. Ft.</span></p>
                        </div>
                        <div style="text-align: right;">
                            <p><span class="label">Unit Number:</span> <br/><span class="val" style="font-size: 18px; color: #4338ca;">${unit?.unit_number || "N/A"}</span></p>
                        </div>
                    </div>

                    <div class="section-title">Final Receivable Ledger</div>
                    <table class="financial-table">
                        <tr style="border-top: 1px solid #e2e8f0;">
                            <td class="label">Agreement Value</td><td class="val">₹${(booking.agreement_cost || 0).toLocaleString()}</td>
                            <td class="val" style="text-align: right;">₹${(booking.total_cost || 0).toLocaleString()}</td>
                        </tr>
                        ${costItems.map((ci:any) => `
                            <tr>
                                <td colspan="3" class="label">${ci.name}</td>
                                <td class="val" style="text-align: right;">₹${(ci.amount || 0).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="3" style="padding: 10px 8px;">FINAL RECEIVABLE TOTAL</td>
                            <td style="text-align: right; padding: 10px 8px;">₹${(booking.total_cost || 0).toLocaleString()}</td>
                        </tr>
                    </table>

                    <div class="grid" style="grid-template-columns: 1fr 1fr; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: #fafafa; margin-top: 10px;">
                        <p style="margin: 0;"><span class="label">Self Contribution:</span> <span class="val">₹${(booking.own_contribution_amount || 0).toLocaleString()}</span></p>
                        <p style="margin: 0; text-align: right;"><span class="label">Bank Loan:</span> <span class="val">₹${(booking.bank_loan_amount || 0).toLocaleString()}</span></p>
                    </div>

                    ${milestones.length > 0 ? `
                        <div class="section-title">Payment Timeline</div>
                        <table class="financial-table" style="font-size: 10px;">
                            <tr style="background: #f1f5f9; font-weight: 800; color: #475569;">
                                <td style="padding: 5px;">Milestone Term</td>
                                <td style="padding: 5px;">Due Date</td>
                                <td style="text-align: right; padding: 5px;">Installment</td>
                            </tr>
                            ${milestones.map((m:any) => `
                                <tr>
                                    <td>${m.milestone}</td>
                                    <td>${new Date(m.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                                    <td style="text-align: right;" class="val">₹${(m.amount || 0).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </table>
                    ` : ''}

                    <div class="footer" style="margin-top: 20px;">
                        <div class="sig-box">
                            <p style="margin-bottom: 25px; color: #1e293b; font-size: 12px; font-weight: 800;">${customerName}</p>
                            CUSTOMER SIGNATURE
                        </div>
                        <div class="sig-box">
                            <p style="margin-bottom: 25px; color: #4338ca; font-size: 12px; font-weight: 800;">Authorized Signatory</p>
                            SALES AGENT / MANAGER
                        </div>
                    </div>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    if (loading) return <div className="p-8 text-slate-400">Syncing ledger...</div>;
    if (!booking) return <div className="p-8 text-red-500">Booking not found.</div>;

    const isPending = booking.status === 'pending_verification' || booking.status === 'Pending Verification';
    const isAccountsVerified = booking.status === 'accounts_verified' || booking.status === 'Accounts Verified';

    const canVerify = (currentUser?.role === 'accounts' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && isPending;
    const canConfirm = (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (isPending || isAccountsVerified);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">←</button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            {booking.customer?.full_name || "N/A"} <span className="text-slate-300 mx-2 font-light">|</span> BOK-{booking.id}
                        </h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 flex items-center">
                            <span className="text-indigo-600 mr-2">{booking.unit?.floor?.tower?.project?.name || "Project N/A"}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 mx-2"></span>
                            <span>Unit {booking.unit?.unit_number || booking.unit_id}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 mx-2"></span>
                            <span className="text-slate-900">₹{(booking.total_cost || 0).toLocaleString()}</span>
                        </p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => handlePrint()}
                        className="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-xl font-bold border border-indigo-100 hover:bg-white transition-all flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2v4h10z" /></svg>
                        <span>Download Master Voucher</span>
                    </button>
                    {canVerify && (
                        <button
                            onClick={() => handleStatusUpdate("Accounts Verified")}
                            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
                        >
                            Verify Payment & Documents
                        </button>
                    )}
                    {canConfirm && (
                        <button
                            onClick={() => handleStatusUpdate("Admin Confirmed")}
                            className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all"
                        >
                            Confirm Reservation
                        </button>
                    )}
                    <button
                        onClick={() => handleStatusUpdate("Cancelled")}
                        className="bg-slate-100 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all"
                    >
                        Cancel Booking
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Financial & Meta */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Reservation Status</h3>
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                            <span className="font-extrabold text-slate-900 uppercase tracking-wide">{booking.status}</span>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Customer Name</p>
                                <p className="text-sm font-bold text-slate-900 mb-2">{booking.customer?.full_name || booking.lead?.full_name || "N/A"}</p>
                                
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Agreed Value</p>
                                <p className="text-xl font-extrabold text-slate-900">₹{(booking.total_cost || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Sales Representative</p>
                                <p className="text-sm font-bold text-slate-700">{booking.created_by?.full_name || `Agent ID: ${booking.created_by_id}`}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Funding Composition</p>
                                <div className="mt-2 text-xs font-bold text-slate-700 flex justify-between">
                                    <span>Bank Loan:</span>
                                    <span>₹{(booking.bank_loan_amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="text-xs font-bold text-slate-700 flex justify-between">
                                    <span>Self Contrib:</span>
                                    <span>₹{(booking.own_contribution_amount || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Schedule */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Milestone Engine</h3>
                        <div className="space-y-4">
                            {booking.payment_schedules && booking.payment_schedules.length > 0 ? (
                                booking.payment_schedules.map((ms: any, i: number) => {
                                    const dDate = new Date(ms.due_date);
                                    const notif24 = new Date(dDate.getTime() - 24 * 60 * 60 * 1000);
                                    const notif5 = new Date(dDate.getTime() - 5 * 60 * 60 * 1000);

                                    return (
                                        <div key={i} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2 relative overflow-hidden group">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-black text-indigo-900 uppercase">{ms.milestone}</p>
                                                    <p className="text-xl font-bold text-slate-800">₹{(ms.amount || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Due Date</p>
                                                    <p className="text-sm font-bold text-indigo-600">{dDate.toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200 mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                                <p className="mb-1 text-slate-500">Scheduled Execution (Alerts):</p>
                                                <div className="flex justify-between items-center group-hover:text-amber-500 transition-colors">
                                                    <span>T-24H Dispatch:</span>
                                                    <span>{notif24.toLocaleDateString()} {notif24.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                </div>
                                                <div className="flex justify-between items-center group-hover:text-red-500 transition-colors">
                                                    <span>T-05H Dispatch:</span>
                                                    <span>{notif5.toLocaleDateString()} {notif5.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-slate-400 italic text-center py-4">No milestone data bound.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Documents & Workflow */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Document Upload */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-indigo-600">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Upload Compliance Documents</h3>
                        <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Document Type / Name</label>
                                <input
                                    type="text"
                                    value={docType}
                                    onChange={(e) => setDocType(e.target.value)}
                                    placeholder="e.g., Payment Receipt, Annexure A..."
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm"
                                />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">File (PDF/Image)</label>
                                <input
                                    type="file"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!file}
                                className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                Upload
                            </button>
                        </form>
                    </div>

                    {/* Document List */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Uploaded Artifacts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {documents.length === 0 ? (
                                <div className="col-span-2 py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                                    No documents uploaded for this reservation yet.
                                </div>
                            ) : (
                                documents.map((doc) => (
                                    <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-2xl">📄</span>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{doc.type}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold">Ver: {doc.version}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/downloads/${doc.id}`, '_blank')}
                                            className="text-xs font-bold text-indigo-600 hover:underline"
                                        >
                                            Download ↓
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
