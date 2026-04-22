"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [lead, setLead] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState("");
    const [activityType, setActivityType] = useState("1"); // Default to first type (Call)
    const [outcomeStatus, setOutcomeStatus] = useState("");
    const [followUpDate, setFollowUpDate] = useState("");
    const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
    const [editingNote, setEditingNote] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [assignedTo, setAssignedTo] = useState("");
    const [status, setStatus] = useState("");
    const [projects, setProjects] = useState<any[]>([]);
    const [projectId, setProjectId] = useState("");
    const [stages, setStages] = useState<any[]>([]);

    // Booking State
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingProjectId, setBookingProjectId] = useState("");
    const [bookingUnitId, setBookingUnitId] = useState("");
    const [availableUnits, setAvailableUnits] = useState<any[]>([]);
    const [bookingCost, setBookingCost] = useState("");
    const [isBookingLoading, setIsBookingLoading] = useState(false);

    // Advanced Booking Flow State
    const [bookingStep, setBookingStep] = useState(1);
    const [bookingAadhar, setBookingAadhar] = useState("");
    const [bookingPan, setBookingPan] = useState("");
    const [bookingAddress, setBookingAddress] = useState("");
    const [coName, setCoName] = useState("");
    const [coPan, setCoPan] = useState("");
    const [bookingOtherCosts, setBookingOtherCosts] = useState<any[]>([]);

    // Financial Structuring
    const [bookingBankLoan, setBookingBankLoan] = useState("0");
    const [bookingOwnContribution, setBookingOwnContribution] = useState("0");
    const [paymentMilestones, setPaymentMilestones] = useState<any[]>([
        { milestone: 'Booking Amount', amount: '', due_date: new Date().toISOString().split('T')[0] },
    ]);

    // Files
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [aadharFile, setAadharFile] = useState<File | null>(null);
    const [panFile, setPanFile] = useState<File | null>(null);
    const [checkFile, setCheckFile] = useState<File | null>(null);

    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            try {
                const [leadRes, actRes, userRes, projRes, stageRes] = await Promise.all([
                    api.get(`/leads/${id}`),
                    api.get(`/activities/lead/${id}`),
                    api.get("/auth/users").catch(() => null),
                    api.get("/projects"),
                    api.get("/leads/config/stages"),
                ]);

                if (leadRes.ok) {
                    const leadData = await leadRes.json();
                    setLead(leadData);
                    setAssignedTo(leadData.assigned_to_id || "");
                    setStatus(leadData.status);
                    setProjectId(leadData.project_id || "");
                }
                if (actRes.ok) setActivities(await actRes.json());
                if (userRes?.ok) setUsers(await userRes.json());
                if (projRes.ok) setProjects(await projRes.json());
                if (stageRes.ok) setStages(await stageRes.json());
            } catch (err) {
                console.error("Failed to load lead details", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

    const handleUpdateLead = async () => {
        try {
            const res = await api.put(`/leads/${id}`, {
                assigned_to_id: assignedTo ? parseInt(assignedTo) : null,
                status: status,
                project_id: projectId ? parseInt(projectId) : null,
            });
            if (res.ok) {
                alert("Lead updated successfully");
            }
        } catch (err) {
            alert("Failed to update lead");
        }
    };

    // Load available units when project changes in booking modal
    useEffect(() => {
        if (!bookingProjectId) {
            setAvailableUnits([]);
            return;
        }

        async function loadUnits() {
            try {
                const res = await api.get("/projects");
                if (res.ok) {
                    const allProjects = await res.json();
                    const p = allProjects.find((proj: any) => proj.id === parseInt(bookingProjectId));
                    const units: any[] = [];
                    p?.towers?.forEach((t: any) => {
                        t.floors?.forEach((f: any) => {
                            f.units?.forEach((u: any) => {
                                if (u.status === 'AVAILABLE') {
                                    units.push(u);
                                }
                            });
                        });
                    });
                    setAvailableUnits(units);
                }
            } catch (err) {
                console.error("Units search failed", err);
            }
        }
        loadUnits();
    }, [bookingProjectId]);

    const handleFullBookingFlow = async () => {
        setIsBookingLoading(true);
        try {
            // 1. Primary Metadata Submission
            const res = await api.post("/bookings/manual", {
                lead_id: parseInt(id),
                unit_id: parseInt(bookingUnitId),
                total_cost: parseFloat(bookingCost),
                full_name: `${lead.first_name} ${lead.last_name}`,
                email: lead.email || `${lead.phone}@placeholder.com`,
                phone: lead.phone,
                aadhaar_number: bookingAadhar,
                pan_number: bookingPan,
                address: bookingAddress,
                bank_loan_amount: parseFloat(bookingBankLoan),
                own_contribution_amount: parseFloat(bookingOwnContribution),
                co_applicants: coName ? [{ full_name: coName, pan_number: coPan }] : [],
                cost_items: bookingOtherCosts.filter(c => c.name && c.amount).map(c => ({
                    name: c.name,
                    amount: parseFloat(c.amount)
                })),
                payment_milestones: paymentMilestones.filter(m => m.milestone && m.amount).map(m => ({
                    milestone: m.milestone,
                    amount: parseFloat(m.amount),
                    due_date: new Date(m.due_date).toISOString()
                }))
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Booking failed during finalization.");
            }

            const { booking_id } = await res.json();

            // 2. Document Upload: Securely saving files to the server
            const uploadQueue = [];
            if (photoFile) uploadQueue.push(uploadDoc(booking_id, "Profile_Photo", photoFile));
            if (aadharFile) uploadQueue.push(uploadDoc(booking_id, "Aadhaar_Card", aadharFile));
            if (panFile) uploadQueue.push(uploadDoc(booking_id, "PAN_Card", panFile));
            if (checkFile) uploadQueue.push(uploadDoc(booking_id, "Cancelled_Cheque", checkFile));

            if (uploadQueue.length > 0) {
                await Promise.all(uploadQueue);
            }

            alert("BOOKING CONFIRMED: Unit inventory has been locked.");
            setShowBookingModal(false);
            window.location.reload();
        } catch (err: any) {
            alert(`Booking Error: ${err.message}`);
        } finally {
            setIsBookingLoading(false);
        }
    };

    const uploadDoc = async (bid: number, type: string, file: File) => {
        const formData = new FormData();
        formData.append("type", type);
        formData.append("file", file);
        return api.upload(`/bookings/${bid}/upload-document`, formData);
    };

    const handleConfirmBooking = handleFullBookingFlow; // Alias for backward compatibility if any reference exists

    const handleLogActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post("/activities", {
                lead_id: parseInt(id),
                activity_type_id: parseInt(activityType),
                note: note,
                follow_up_at: followUpDate ? new Date(followUpDate).toISOString() : null,
                new_status: outcomeStatus || null
            });
            if (res.ok) {
                const newActivity = await res.json();
                setActivities([newActivity, ...activities]);
                setNote("");
                setFollowUpDate("");
                setOutcomeStatus("");
                // Refresh lead status if it changed
                if (outcomeStatus) {
                    setStatus(outcomeStatus);
                }
            }
        } catch (err) {
            alert("Failed to log activity");
        }
    };

    const handleDeleteActivity = async (actId: number) => {
        if (!confirm("Are you sure you want to delete this log?")) return;
        try {
            const res = await api.delete(`/activities/${actId}`);
            if (res.ok) {
                setActivities(activities.filter(a => a.id !== actId));
            }
        } catch (err) { alert("Delete failed"); }
    };

    const handleUpdateActivity = async (actId: number) => {
        try {
            const act = activities.find(a => a.id === actId);
            const res = await api.put(`/activities/${actId}`, {
                ...act,
                note: editingNote
            });
            if (res.ok) {
                const updated = await res.json();
                setActivities(activities.map(a => a.id === actId ? updated : a));
                setEditingActivityId(null);
            }
        } catch (err) { alert("Update failed"); }
    };

    if (loading) return <div className="p-8 text-slate-400">Loading lead details...</div>;
    if (!lead) return <div className="p-8 text-red-500">Lead not found.</div>;

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">←</button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{lead.first_name} {lead.last_name}</h1>
                        <p className="text-slate-500">Managing Lead ID: LEAD-{lead.id}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                    >
                        {stages.map(s => (
                            <option key={s.slug} value={s.slug}>{s.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleUpdateLead}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all"
                    >
                        Save Changes
                    </button>
                    {(lead.status !== 'won' && lead.status !== 'qualified') && (
                        <button 
                            onClick={() => router.push(`/dashboard/bookings/create?lead=${id}`)}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-2 text-xs uppercase tracking-widest"
                        >
                            <span>Book Unit</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Multi-Step Booking Wizard */}
            {showBookingModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-10 max-w-4xl w-full shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[95vh] border border-slate-100">
                        {/* Header & Progress */}
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Book Unit</h2>
                                <div className="flex items-center space-x-3">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <div key={s} className={`h-1.5 w-10 rounded-full transition-all duration-500 ${bookingStep >= s ? 'bg-indigo-600 shadow-sm shadow-indigo-100' : 'bg-slate-100'}`} />
                                    ))}
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Step {bookingStep} of 5</span>
                                </div>
                            </div>
                            <button onClick={() => setShowBookingModal(false)} className="bg-slate-50 p-3 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">✕</button>
                        </div>

                        {/* Step 1: Unit & Base Selection */}
                        {bookingStep === 1 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <section className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Project</label>
                                        <select
                                            value={bookingProjectId}
                                            onChange={(e) => setBookingProjectId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 appearance-none transition-all"
                                        >
                                            <option value="">Select Project</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Available Inventory</label>
                                        <select
                                            value={bookingUnitId}
                                            onChange={(e) => setBookingUnitId(e.target.value)}
                                            disabled={!bookingProjectId}
                                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 appearance-none transition-all disabled:opacity-50"
                                        >
                                            <option value="">Select Unit</option>
                                            {availableUnits.map(u => (
                                                <option key={u.id} value={u.id}>{u.unit_number} ({u.unit_type || 'N/A'}) - {u.saleable_area} sqft</option>
                                            ))}
                                        </select>
                                    </div>
                                </section>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Agreed Base Consideration (₹)</label>
                                    <input
                                        type="text"
                                        value={bookingCost}
                                        onChange={(e) => setBookingCost(e.target.value.replace(/^0+/, ''))}
                                        className="w-full bg-indigo-50/30 border border-indigo-100 px-8 py-6 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-indigo-500/20 font-black text-4xl text-indigo-600 placeholder:text-indigo-200 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Primary Applicant KYC */}
                        {bookingStep === 2 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Aadhaar Number</label>
                                        <input
                                            type="text"
                                            value={bookingAadhar}
                                            onChange={(e) => setBookingAadhar(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl outline-none font-bold placeholder:text-slate-300"
                                            placeholder="XXXX XXXX XXXX"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">PAN Card Number</label>
                                        <input
                                            type="text"
                                            value={bookingPan}
                                            onChange={(e) => setBookingPan(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl outline-none font-bold uppercase placeholder:text-slate-300"
                                            placeholder="ABCDE1234F"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Address (As per Aadhaar)</label>
                                    <textarea
                                        value={bookingAddress}
                                        onChange={(e) => setBookingAddress(e.target.value)}
                                        rows={3}
                                        className="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl outline-none font-medium text-slate-700"
                                        placeholder="Enter permanent address..."
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Selfie Photo</p>
                                        <input type="file" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="hidden" id="photo-up" />
                                        <label htmlFor="photo-up" className="block cursor-pointer text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-all">{photoFile ? 'ATTACHED' : 'UPLOAD'}</label>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Aadhaar (F/B)</p>
                                        <input type="file" onChange={(e) => setAadharFile(e.target.files?.[0] || null)} className="hidden" id="aadhar-up" />
                                        <label htmlFor="aadhar-up" className="block cursor-pointer text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-all">{aadharFile ? 'ATTACHED' : 'UPLOAD'}</label>
                                    </div>
                                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center space-y-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PAN Card</p>
                                        <input type="file" onChange={(e) => setPanFile(e.target.files?.[0] || null)} className="hidden" id="pan-up" />
                                        <label htmlFor="pan-up" className="block cursor-pointer text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-all">{panFile ? 'ATTACHED' : 'UPLOAD'}</label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Co-Applicant & Additional Costs */}
                        {bookingStep === 3 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                                        Co-Applicant Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            value={coName}
                                            onChange={(e) => setCoName(e.target.value.replace(/\b\w/g, char => char.toUpperCase()))}
                                            placeholder="Partner Full Name"
                                            className="bg-white border border-slate-200 px-5 py-3 rounded-xl outline-none text-sm font-bold"
                                        />
                                        <input
                                            type="text"
                                            value={coPan}
                                            onChange={(e) => setCoPan(e.target.value)}
                                            placeholder="Co-App PAN"
                                            className="bg-white border border-slate-200 px-5 py-3 rounded-xl outline-none text-sm font-bold uppercase"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pl-1">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Additional Costs</h3>
                                        <button
                                            onClick={() => setBookingOtherCosts([...bookingOtherCosts, { name: '', amount: '' }])}
                                            className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                                        >
                                            ➕ Add New Charge
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {bookingOtherCosts.length === 0 && (
                                            <div className="py-6 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">No extra charges applied (e.g. No Parking)</p>
                                            </div>
                                        )}
                                        {bookingOtherCosts.map((cost, idx) => (
                                            <div key={idx} className="flex space-x-3 items-center animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex-1 relative">
                                                    <input
                                                        type="text"
                                                        list="charge-presets"
                                                        value={cost.name}
                                                        onChange={(e) => {
                                                            const newCosts = [...bookingOtherCosts];
                                                            newCosts[idx].name = e.target.value;
                                                            setBookingOtherCosts(newCosts);
                                                        }}
                                                        placeholder="Charge Name (e.g. Extra Balcony)"
                                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-3.5 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                    />
                                                </div>
                                                <div className="w-40 relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                                    <input
                                                        type="number"
                                                        value={cost.amount}
                                                        onChange={(e) => {
                                                            const newCosts = [...bookingOtherCosts];
                                                            newCosts[idx].amount = e.target.value;
                                                            setBookingOtherCosts(newCosts);
                                                        }}
                                                        placeholder="0"
                                                        className="w-full bg-slate-50 border border-slate-100 pl-8 pr-5 py-3.5 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-right text-indigo-600"
                                                    />
                                                </div>
                                                <button onClick={() => setBookingOtherCosts(bookingOtherCosts.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 group transition-all">
                                                    <div className="bg-red-50 p-3 rounded-xl group-hover:bg-red-100 border border-red-100">🗑️</div>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <datalist id="charge-presets">
                                        <option value="PLC (Preferential Location)" />
                                        <option value="Club Membership" />
                                        <option value="Covered Parking" />
                                        <option value="Infrastructure Dev" />
                                        <option value="Power Backup" />
                                        <option value="Possession Charges" />
                                        <option value="Extra Balcony Charge" />
                                        <option value="Custom Finishing" />
                                        <option value="GST (12%)" />
                                        <option value="Stamp Duty & Reg" />
                                    </datalist>
                                </div>

                                <div className="p-6 bg-orange-50/50 border border-orange-100 rounded-[2rem] space-y-3">
                                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Payment Verification</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-slate-600">Attachment: Photo of Cancelled Cheque</p>
                                        <input type="file" onChange={(e) => setCheckFile(e.target.files?.[0] || null)} className="hidden" id="check-up" />
                                        <label htmlFor="check-up" className="cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-orange-200 text-[10px] font-black text-orange-600 hover:bg-orange-600 hover:text-white transition-all uppercase">
                                            {checkFile ? 'VERIFIED' : 'ATTACH CHECK'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Payment Schedules */}
                        {bookingStep === 4 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bank Loan Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={bookingBankLoan}
                                            onChange={(e) => setBookingBankLoan(e.target.value)}
                                            className="w-full bg-transparent border-none outline-none font-black text-2xl text-slate-700 placeholder:text-slate-200"
                                            placeholder="0.00"
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold mt-2 italic">Secured through financial institution</p>
                                    </div>
                                    <div className="space-y-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Self-Contribution (₹)</label>
                                        <input
                                            type="number"
                                            value={bookingOwnContribution}
                                            onChange={(e) => setBookingOwnContribution(e.target.value)}
                                            className="w-full bg-transparent border-none outline-none font-black text-2xl text-slate-700 placeholder:text-slate-200"
                                            placeholder="0.00"
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold mt-2 italic">Via Bank Transfer / Check (No Cash)</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between pl-1">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Payment Milestones</h3>
                                        <button
                                            onClick={() => setPaymentMilestones([...paymentMilestones, { milestone: '', amount: '', due_date: new Date().toISOString().split('T')[0] }])}
                                            className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-white transition-all uppercase tracking-widest"
                                        >
                                            ➕ Add Milestone
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {paymentMilestones.map((ms, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-3 items-center animate-in slide-in-from-top-2 duration-200">
                                                <div className="col-span-5 relative">
                                                    <input
                                                        type="text"
                                                        value={ms.milestone}
                                                        list="milestone-presets"
                                                        onChange={(e) => {
                                                            const newMs = [...paymentMilestones];
                                                            newMs[idx].milestone = e.target.value;
                                                            setPaymentMilestones(newMs);
                                                        }}
                                                        placeholder="Milestone Name"
                                                        className="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl font-bold text-sm outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="col-span-3 relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                                                    <input
                                                        type="number"
                                                        value={ms.amount}
                                                        onChange={(e) => {
                                                            const newMs = [...paymentMilestones];
                                                            newMs[idx].amount = e.target.value;
                                                            setPaymentMilestones(newMs);
                                                        }}
                                                        placeholder="0"
                                                        className="w-full bg-slate-50 border border-slate-100 pl-8 pr-4 py-3 rounded-2xl font-bold text-sm outline-none transition-all text-right"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <input
                                                        type="date"
                                                        value={ms.due_date}
                                                        onChange={(e) => {
                                                            const newMs = [...paymentMilestones];
                                                            newMs[idx].due_date = e.target.value;
                                                            setPaymentMilestones(newMs);
                                                        }}
                                                        className="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl font-bold text-sm outline-none transition-all"
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <button onClick={() => setPaymentMilestones(paymentMilestones.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-all mx-auto block">
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <datalist id="milestone-presets">
                                        <option value="Booking Amount" />
                                        <option value="On Agreement" />
                                        <option value="Plinth Level" />
                                        <option value="First Slab" />
                                        <option value="Finishing Work" />
                                        <option value="Possession" />
                                    </datalist>
                                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-tighter">🔔 Operational Policy: Automated SMS and App notifications will be pushed to the customer 3 days prior to each due date.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Review & Confirm */}
                        {bookingStep === 5 && (
                            <div className="space-y-8 animate-in zoom-in-95 duration-300">
                                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-12 text-white shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <div className="text-8xl font-black italic">BOOKED</div>
                                    </div>
                                    <div className="relative z-10 space-y-10">
                                        <div className="flex justify-between items-start border-b border-white/10 pb-8">
                                            <div>
                                                <h3 className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">Booking Confirmation</h3>
                                                <p className="text-3xl font-black tracking-tight">{lead.first_name} {lead.last_name}</p>
                                                <p className="text-white/40 font-bold text-sm">UID: {bookingAadhar || 'PENDING'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Total Consideration</p>
                                                <p className="text-5xl font-black text-indigo-400">
                                                    ₹{(parseFloat(bookingCost || '0') + bookingOtherCosts.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0)).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-12">
                                            <div className="space-y-4">
                                                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Payment Breakdown</p>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-white/60 font-bold italic">Bank Loan</span>
                                                        <span className="font-black text-indigo-300">₹{parseFloat(bookingBankLoan || '0').toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-white/60 font-bold italic">Self Pay (Net)</span>
                                                        <span className="font-black text-green-300">₹{parseFloat(bookingOwnContribution || '0').toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4 col-span-2 border-l border-white/5 pl-12">
                                                <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Payment Schedule</p>
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                                    {paymentMilestones.slice(0, 4).map((ms, i) => ms.milestone && (
                                                        <div key={i} className="flex justify-between text-[11px] items-center">
                                                            <span className="text-white/50 font-bold truncate pr-2">{ms.milestone}</span>
                                                            <span className="font-black text-indigo-200 tabular-nums">₹{parseFloat(ms.amount || '0').toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                    {paymentMilestones.length > 4 && <div className="text-[9px] text-white/30 font-black italic">+{paymentMilestones.length - 4} more schedules</div>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex items-center space-x-4">
                                            <div className="bg-indigo-500/20 p-3 rounded-2xl text-xl">📜</div>
                                            <p className="text-[10px] leading-relaxed text-white/60 font-medium">
                                                By proceeding, you verify that all documents are authentic and the unit will be marked as <span className="text-indigo-400 font-bold">RESERVATION_PENDING</span>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Controls */}
                        <div className="flex space-x-4 mt-12 pt-8 border-t border-slate-100">
                            {bookingStep > 1 && (
                                <button
                                    onClick={() => setBookingStep(bookingStep - 1)}
                                    className="flex-1 bg-slate-50 text-slate-400 px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all"
                                >
                                    Previous Step
                                </button>
                            )}
                            {bookingStep < 5 ? (
                                <button
                                    onClick={() => setBookingStep(bookingStep + 1)}
                                    disabled={bookingStep === 1 && (!bookingUnitId || !bookingCost)}
                                    className="flex-[2] bg-indigo-600 text-white px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
                                >
                                    Proceed to Step {bookingStep + 1}
                                </button>
                            ) : (
                                <button
                                    onClick={handleFullBookingFlow}
                                    disabled={isBookingLoading}
                                    className="flex-[2] bg-green-600 text-white px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:bg-green-700 shadow-xl shadow-green-100 transition-all disabled:opacity-50"
                                >
                                    {isBookingLoading ? '🔒 Securing Asset...' : 'Confirm Reservation & Lock Asset'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Profile & Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Information</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Phone Number</p>
                                <div className="flex items-center space-x-2">
                                    <p className="text-slate-800 font-semibold">{lead.phone}</p>
                                    <a 
                                        href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-1 px-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center space-x-1"
                                    >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.633 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                                        <span>WHATSAPP</span>
                                    </a>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Email Address</p>
                                <p className="text-slate-800 font-semibold">{lead.email || "Not provided"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Source</p>
                                <p className="text-slate-800 font-semibold">{lead.source_ref?.name || "Direct Marketing"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Interested Project</p>
                                <select
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                    className="mt-1 w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm font-semibold"
                                >
                                    <option value="">No Project Assigned</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Budget Capacity</p>
                                <p className="text-slate-800 font-semibold">₹{lead.budget?.toLocaleString() || "Not specified"}</p>
                            </div>
                        </div>
                    </div>

                    {users.length > 0 && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ownership & Assignment</h3>
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-xs text-slate-400 font-bold uppercase">Assigned To</span>
                                    <select
                                        value={assignedTo}
                                        onChange={(e) => setAssignedTo(e.target.value)}
                                        className="mt-1 w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Activity Logging & Timeline */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Activity Form */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-indigo-600">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Log Interaction</h3>
                        <form onSubmit={handleLogActivity} className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <select
                                    value={activityType}
                                    onChange={(e) => setActivityType(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold"
                                >
                                    <option value="1">Call</option>
                                    <option value="2">Meeting</option>
                                    <option value="3">Site Visit</option>
                                    <option value="4">Note</option>
                                </select>
                                <select
                                    value={outcomeStatus}
                                    onChange={(e) => setOutcomeStatus(e.target.value)}
                                    className="bg-orange-50/50 border border-orange-100 px-4 py-2 rounded-xl text-sm font-bold text-orange-600"
                                >
                                    <option value="">-- Set Outcome Status --</option>
                                    {stages.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                                </select>
                                <input
                                    type="datetime-local"
                                    value={followUpDate}
                                    onChange={(e) => setFollowUpDate(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm"
                                    placeholder="Schedule Follow-up"
                                />
                            </div>
                            <textarea
                                rows={3}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                required
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Write observation notes here..."
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"
                                >
                                    Post Activity
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Engagement Timeline</h3>
                        {activities.length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                No recorded interactions yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activities.map((act) => (
                                    <div key={act.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-4 animate-fade-in group relative">
                                        <div className="mt-1 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-xs">
                                            {act.activity_type_id === 1 ? "📞" : act.activity_type_id === 2 ? "🤝" : act.activity_type_id === 3 ? "📍" : "📝"}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-tighter">
                                                        {act.activity_type_id === 1 ? "Call" : act.activity_type_id === 2 ? "Meeting" : act.activity_type_id === 3 ? "Site Visit" : "Note"}
                                                    </span>
                                                    {editingActivityId === act.id && <span className="text-[10px] text-orange-500 font-bold uppercase animate-pulse">Editing...</span>}
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-[10px] text-slate-400 font-bold">{new Date(act.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}</span>
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => { setEditingActivityId(act.id); setEditingNote(act.note); }}
                                                            className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-indigo-600"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteActivity(act.id)}
                                                            className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-red-500"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            {editingActivityId === act.id ? (
                                                <div className="space-y-2 mt-2">
                                                    <textarea 
                                                        className="w-full bg-slate-50 border-2 border-indigo-100 p-3 rounded-xl text-sm outline-none font-bold"
                                                        value={editingNote}
                                                        onChange={(e) => setEditingNote(e.target.value)}
                                                        rows={2}
                                                    />
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => handleUpdateActivity(act.id)} className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg">SAVE</button>
                                                        <button onClick={() => setEditingActivityId(null)} className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-black rounded-lg">CANCEL</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{act.note}</p>
                                            )}
                                            {act.follow_up_at && (
                                                <div className="mt-2 flex items-center space-x-2 text-[10px] font-bold text-orange-600 bg-orange-50 w-fit px-2 py-0.5 rounded uppercase">
                                                    <span>⏰ Follow-up: {new Date(act.follow_up_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}</span>
                                                    {act.is_overdue && <span>(Overdue)</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
