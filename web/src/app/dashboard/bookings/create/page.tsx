"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

export default function CreateBookingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const unitIdFromQuery = searchParams.get("unit");
    const leadIdFromQuery = searchParams.get("lead");

    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedUnitId, setSelectedUnitId] = useState(unitIdFromQuery || "");
    const [availableUnits, setAvailableUnits] = useState<any[]>([]);

    const [unit, setUnit] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(unitIdFromQuery ? 2 : 1);
    const [totalSteps] = useState(5);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Form State
    const [selectedLead, setSelectedLead] = useState("");
    const [customerData, setCustomerData] = useState({
        full_name: "", email: "", phone: "", pan_number: "", aadhaar_number: "", address: ""
    });

    const [costs, setCosts] = useState({ agreement_cost: 0, actual_cost: 0 });
    const [costItems, setCostItems] = useState<any[]>([
        { name: "Development Charges", amount: 0 },
        { name: "Legal/Documentation", amount: 0 }
    ]);
    const [financialTerms, setFinancialTerms] = useState({ bank_loan_amount: 0, own_contribution_amount: 0 });
    const [milestones, setMilestones] = useState<any[]>([
        { milestone: "Booking Amount", amount: "", due_date: new Date().toISOString().split('T')[0] }
    ]);
    const [photo, setPhoto] = useState<File | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const [links, user, projs] = await Promise.all([
                    api.get("/leads"), api.get("/auth/me").catch(() => null), api.get("/projects")
                ]);
                if (links.ok) { const d = await links.json(); setLeads(Array.isArray(d) ? d : (d.items || [])); }
                if (user?.ok) setCurrentUser(await user.json());
                if (projs.ok) setProjects(await projs.json());
                if (unitIdFromQuery) {
                    const u = await api.get(`/projects/units/detail/${unitIdFromQuery}`);
                    if (u.ok) {
                        const d = await u.json(); setUnit(d);
                        setSelectedProject(d.floor?.tower?.project?.id?.toString() || "");
                    }
                }
            } catch (err) { console.error(err); } finally { setLoading(false); }
        }
        loadData();
    }, [unitIdFromQuery]);

    useEffect(() => {
        if (!selectedProject) { setAvailableUnits([]); return; }
        const p = projects.find(proj => proj.id === parseInt(selectedProject));
        const uArr: any[] = [];
        p?.towers?.forEach((t: any) => t.floors?.forEach((f: any) => f.units?.forEach((u: any) => {
            if (u.status === 'AVAILABLE' || u.id === parseInt(unitIdFromQuery || "0")) uArr.push(u);
        })));
        setAvailableUnits(uArr);
    }, [selectedProject, projects, unitIdFromQuery]);

    useEffect(() => {
        if (selectedUnitId) { api.get(`/projects/units/detail/${selectedUnitId}`).then(r => r.json()).then(d => setUnit(d)); }
    }, [selectedUnitId]);

    const othersTotal = useMemo(() => costItems.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0), [costItems]);
    const finalTotal = useMemo(() => (costs.actual_cost || 0) + othersTotal, [costs.actual_cost, othersTotal]);

    // Dynamic Cost Handlers
    const addCostRow = () => setCostItems([...costItems, { name: "", amount: 0 }]);
    const removeCostRow = (idx: number) => setCostItems(costItems.filter((_, i) => i !== idx));
    const editCostItem = (idx: number, field: string, val: any) => {
        const up = [...costItems];
        up[idx] = { ...up[idx], [field]: val };
        setCostItems(up);
    };

    const addMilestone = () => setMilestones([...milestones, { milestone: "", amount: "", due_date: new Date().toISOString().split('T')[0] }]);
    const removeMilestone = (idx: number) => setMilestones(milestones.filter((_, i) => i !== idx));
    const editMilestone = (idx: number, field: string, val: any) => {
        const up = [...milestones];
        up[idx] = { ...up[idx], [field]: val };
        setMilestones(up);
    };

    const milestoneTotal = useMemo(() => milestones.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0), [milestones]);
    const balanceRemaining = finalTotal - milestoneTotal;

    const handleCreateBooking = async () => {
        if (!photo) { alert("Signed form photo mandatory."); setStep(5); return; }
        if (Math.abs(balanceRemaining) > 1) { alert("Milestone total must match Final Total."); setStep(4); return; }
        try {
            const formData = new FormData();
            const payload = {
                unit_id: parseInt(selectedUnitId || "0"),
                ...customerData,
                agreement_cost: costs.agreement_cost,
                actual_cost: costs.actual_cost,
                other_costs: othersTotal,
                total_cost: costs.actual_cost,
                final_total_cost: finalTotal,
                cost_items: costItems,
                bank_loan_amount: financialTerms.bank_loan_amount,
                own_contribution_amount: financialTerms.own_contribution_amount,
                payment_milestones: milestones.map(m => ({ 
                    milestone: m.milestone, 
                    amount: parseFloat(m.amount) || 0, 
                    due_date: new Date(m.due_date).toISOString() 
                }))
            };
            formData.append("data", JSON.stringify(payload));
            formData.append("photo", photo);
            const res = await api.upload("/bookings/manual", formData);
            if (res.ok) { alert("Booking Confirmed!"); router.push("/dashboard/bookings"); }
            else { alert("Failed. Check fields."); }
        } catch (err) { alert("Error."); }
    };

    const handlePrint = () => {
        const logoUrl = "/logo.png";
        const printContent = `
            <html>
                <head>
                    <title>Jay Developers - Booking Confirmation</title>
                    <style>
                        @media print { .no-print { display: none; } @page { margin: 10mm; } }
                        body { font-family: sans-serif; color: #1e293b; line-height: 1.25; padding: 0; margin: 0; font-size: 10px; }
                        .header-box { padding: 5px 25px; border-bottom: 2.5px solid #0056b3; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
                        .co-name { text-align: right; }
                        .co-name h1 { margin: 0; font-size: 28px; font-weight: 950; color: #0056b3; font-style: italic; font-family: serif; }
                        .co-name p { margin: 1px 0 0 0; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; font-size: 10px; }
                        .contact-footer { text-align: center; font-size: 8px; font-weight: 700; color: #64748b; padding: 4px 0; border-top: 0.5px solid #cbd5e1; margin: 0 25px; }
                        .sec-title { font-size: 9px; font-weight: 950; background: #f1f5f9; padding: 5px 25px; text-transform: uppercase; border-left: 4px solid #0056b3; margin-top: 10px; margin-bottom: 8px; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 0 25px; margin-bottom: 10px; }
                        .item { border: 0.5px solid #e2e8f0; padding: 8px 12px; border-radius: 4px; }
                        .label { color: #64748b; font-size: 7px; font-weight: 800; text-transform: uppercase; }
                        .val { font-weight: 800; font-size: 11px; margin-top: 1px; color: #0f172a; }
                        
                        table { width: calc(100% - 50px); margin: 0 25px; border-collapse: collapse; border: 0.5px solid #cbd5e1; }
                        th { background: #f8fafc; text-align: left; padding: 8px 12px; font-weight: 900; font-size: 8px; border-bottom: 1px solid #cbd5e1; }
                        td { padding: 8px 12px; border-bottom: 0.5px solid #f1f5f9; font-weight: 700; font-size: 10px; }
                        .total-row { background: #0056b3; color: #fff; font-size: 14px; font-weight: 900; }
                        
                        .terms-container { margin: 15px 25px; border: 0.5px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #fff; }
                        .terms-title { font-weight: 900; font-size: 9px; text-decoration: underline; margin-bottom: 6px; color: #000; }
                        .term-item { display: flex; gap: 6px; font-size: 8px; margin-bottom: 4px; color: #334155; line-height: 1.2; }
                        
                        .footer-sigs { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 40px; }
                        .sig-cell { border-top: 1.5px solid #000; width: 180px; text-align: center; padding-top: 6px; font-weight: 900; font-size: 9px; }
                    </style>
                </head>
                <body>
                    <div class="header-box">
                        <img src="${logoUrl}" style="height: 48px;" />
                        <div class="co-name"><h1>JAY DEVELOPERS</h1><p>BUILDERS & LAND DEVELOPERS</p></div>
                    </div>
                    <div style="text-align:center; margin-bottom: 8px;"><h2 style="margin:0; font-size: 16px; font-weight: 950; letter-spacing: 3px; color: #0056b3;">BOOKING CONFIRMATION</h2></div>
                    <div class="grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 8px;">
                        <div style="font-weight: 900;">REF: BK-${Math.floor(Date.now()/1000)}</div>
                        <div style="text-align: right; font-weight: 900;">DATE: ${new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</div>
                    </div>

                    <div class="sec-title">Property & Allotment</div>
                    <div class="grid">
                        <div class="item"><div class="label">Project Name</div><div class="val">${unit?.floor?.tower?.project?.name}</div></div>
                        <div class="item"><div class="label">Unit Number</div><div class="val" style="color:red; font-size: 13px;">${unit?.unit_number}</div></div>
                    </div>
                    <div class="grid">
                        <div class="item"><div class="label">Saleable Area</div><div class="val">${unit?.saleable_area} Sq. Ft.</div></div>
                        <div class="item"><div class="label">Floor / Tower</div><div class="val">${unit?.floor?.floor_number} / ${unit?.floor?.tower?.name}</div></div>
                    </div>

                    <div class="sec-title">Applicant Details</div>
                    <div class="grid">
                        <div class="item"><div class="label">Primary Applicant</div><div class="val">${customerData.full_name}</div></div>
                        <div class="item"><div class="label">Contact / KYC</div><div class="val">${customerData.phone} | PAN: ${customerData.pan_number || '---'}</div></div>
                    </div>

                    <div class="sec-title">Financial Summary</div>
                    <table>
                        <thead><tr><th>DESCRIPTION</th><th style="text-align:right">VALUE (₹)</th></tr></thead>
                        <tbody>
                            <tr><td>Agreement Property Value (Baseline)</td><td style="text-align:right">₹${costs.agreement_cost.toLocaleString()}</td></tr>
                            ${costItems.map(it => `<tr><td>${it.name || 'Misc Charges'}</td><td style="text-align:right">₹${(parseFloat(it.amount)||0).toLocaleString()}</td></tr>`).join('')}
                            <tr class="total-row"><td>TOTAL FINAL RECEIVABLE</td><td style="text-align:right">₹${finalTotal.toLocaleString()}</td></tr>
                        </tbody>
                    </table>

                    <div class="terms-container">
                        <div class="terms-title">TERMS & CONDITIONS / DECLARATION:</div>
                        <div class="term-item"><span>1.</span> This is a provisional booking valid for 7 days subject to clearance of booking amount.</div>
                        <div class="term-item"><span>2.</span> Final allotment is subject to execution of Registered Agreement for Sale within 30 days.</div>
                        <div class="term-item"><span>3.</span> GST, Stamp Duty, Registration, and Society maintenance are payable by the customer as per Govt. norms.</div>
                        <div class="term-item"><span>4.</span> Cancellation charges of 10% on booking value will apply if the agreement is not executed in time.</div>
                        <div class="term-item"><span>5.</span> All payments must be in favor of <b>"JAY DEVELOPERS"</b>. No cash payments are encouraged.</div>
                        <div class="term-item"><span>6.</span> Possession is tentative and subject to force majeure and timely stage-wise payments.</div>
                    </div>

                    <div class="footer-sigs">
                        <div class="sig-cell">APPLICANT'S SIGNATURE</div>
                        <div class="sig-cell">FOR JAY DEVELOPERS</div>
                    </div>

                    <div style="margin-top:20px;" class="contact-footer">
                        Sancheti Heights, Quality Hardware Lane, Nashik-5. | Tel: +91 253 2305308 | jaydevelopers.com
                    </div>
                </body>
            </html>
        `;
        const w = window.open('', '_blank');
        if (w) { w.document.write(printContent); w.document.close(); setTimeout(() => { w.print(); }, 700); }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-10 space-y-8 animate-fade-in pb-32">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 leading-none tracking-tight">Jay Developers Portal</h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mt-4">Stage {step} of 5 • Production</p>
                </div>
                <div className="flex items-center space-x-2 bg-white p-2 rounded-3xl border shadow-sm">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-3 ${step === i ? 'w-12' : 'w-4'} ${step >= i ? 'bg-indigo-600' : 'bg-slate-100'} rounded-full transition-all duration-700`} />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl sticky top-10 space-y-8 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600 blur-[80px] opacity-20 -mr-16 -mt-16"></div>
                        <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Selected Unit</p><p className="text-3xl font-black mt-2">{unit?.unit_number || "---"}</p></div>
                        <div><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Gross Total</p><p className="text-3xl font-black mt-2 text-emerald-400 font-mono tracking-tighter">₹{finalTotal.toLocaleString()}</p></div>
                        <div className="pt-8 border-t border-slate-700"><p className="text-[10px] font-bold text-slate-500 uppercase">Customer Name</p><p className="text-sm font-bold mt-1 text-slate-300">{customerData.full_name || "Waiting..."}</p></div>
                        
                        {step >= 4 && (
                            <div className={`pt-8 border-t ${balanceRemaining === 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                                <p className="text-[10px] font-black uppercase text-slate-400">Ledger Balance</p>
                                <p className={`text-xl font-black mt-1 ${balanceRemaining === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {balanceRemaining === 0 ? "✓ Balanced" : `₹${balanceRemaining.toLocaleString()} Left`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl p-10 sm:p-16 relative overflow-hidden min-h-[650px] flex flex-col">
                        
                        {step === 1 && (
                            <div className="space-y-10 animate-slide-up relative z-10">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">1. Property Selection</h2>
                                <div className="space-y-8">
                                    <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-[2rem] font-black focus:border-indigo-600 outline-none appearance-none transition-all">
                                        <option value="">-- Choose Project --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-4">
                                        {availableUnits.map(u => (
                                            <button key={u.id} onClick={() => setSelectedUnitId(u.id.toString())} className={`p-5 rounded-2xl border-2 font-black transition-all transform active:scale-95 ${selectedUnitId === u.id.toString() ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white text-slate-300 hover:border-indigo-200'}`}>
                                                {u.unit_number}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-10 animate-slide-up relative z-10">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">2. Customer Record</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <input type="text" placeholder="Full Name" value={customerData.full_name} onChange={e => setCustomerData({...customerData, full_name: e.target.value})} className="sm:col-span-2 p-6 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black focus:bg-white focus:border-indigo-100 outline-none transition-all" />
                                    <input type="text" placeholder="Phone" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="p-6 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black" />
                                    <input type="email" placeholder="Email" value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} className="p-6 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black" />
                                    <input type="text" placeholder="Aadhaar" value={customerData.aadhaar_number} onChange={e => setCustomerData({...customerData, aadhaar_number: e.target.value})} className="p-6 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black" />
                                    <input type="text" placeholder="PAN" value={customerData.pan_number} onChange={e => setCustomerData({...customerData, pan_number: e.target.value.toUpperCase()})} className="p-6 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black font-mono uppercase" />
                                    <textarea placeholder="Residential Address" value={customerData.address} onChange={e => setCustomerData({...customerData, address: e.target.value})} className="sm:col-span-2 p-6 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black h-32 resize-none" />
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-10 animate-slide-up relative z-10">
                                <h2 className="text-3xl font-black text-slate-800 tracking-tight">3. Costs & T&C</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest pl-2">Base Financials</p>
                                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Agreement Value</label><input type="number" value={costs.agreement_cost} onChange={e => setCosts({...costs, agreement_cost: parseFloat(e.target.value)||0})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black text-2xl" /></div>
                                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Actual Sale Value (Final)</label><input type="number" value={costs.actual_cost} onChange={e => setCosts({...costs, actual_cost: parseFloat(e.target.value)||0})} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl font-black text-2xl text-indigo-900" /></div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center px-2">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Add Custom Charges</p>
                                            <button onClick={addCostRow} className="h-7 w-7 bg-indigo-600 shadow-lg shadow-indigo-100 text-white rounded-full flex items-center justify-center font-black">+</button>
                                        </div>
                                        <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                            {costItems.map((it, idx) => (
                                                <div key={idx} className="flex gap-2 items-center slide-in-bottom">
                                                    <input placeholder="Charge Name" value={it.name} onChange={e => editCostItem(idx, 'name', e.target.value)} className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs" />
                                                    <input type="number" value={it.amount} onChange={e => editCostItem(idx, 'amount', e.target.value)} className="w-28 p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs" />
                                                    <button onClick={() => removeCostRow(idx)} className="text-rose-500 font-black px-2 text-lg hover:bg-rose-50 rounded-lg">×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2 pt-10 border-t flex flex-col sm:flex-row gap-6">
                                        <div className="flex-1 p-8 bg-indigo-900 text-white rounded-[2.5rem] shadow-2xl flex flex-col justify-between">
                                            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest text-center sm:text-left">Net Amount Final</p>
                                            <p className="text-4xl font-black text-center sm:text-left mt-2">₹{finalTotal.toLocaleString()}</p>
                                            <button onClick={handlePrint} className="w-full mt-6 py-4 bg-white text-indigo-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 active:scale-95 transition-all">Download Letterhead</button>
                                        </div>
                                        <div className="flex-1 p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem]">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-4 tracking-widest">Bank Funding (Loan)</p>
                                            <input type="number" value={financialTerms.bank_loan_amount} onChange={e => setFinancialTerms({...financialTerms, bank_loan_amount: parseFloat(e.target.value)||0})} className="w-full bg-transparent font-black text-4xl text-slate-800 outline-none" placeholder="₹0" />
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Visible on Letterhead</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-1">Full Terms & Conditions generated on print.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {step === 4 && (
                            <div className="space-y-8 animate-slide-up relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">4. Payment Timeline</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">{milestones.length} Milestones Defined</p>
                                    </div>
                                    <button onClick={addMilestone} className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">+ Add Milestone</button>
                                </div>

                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {milestones.map((ms, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-4 p-6 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-indigo-100 transition-all group">
                                            <div className="col-span-5 space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Milestone / Stage</label>
                                                <input placeholder="e.g. Plinth Level Completion" value={ms.milestone} onChange={e => editMilestone(idx, 'milestone', e.target.value)} className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-bold text-sm" />
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Due Date</label>
                                                <input type="date" value={ms.due_date} onChange={e => editMilestone(idx, 'due_date', e.target.value)} className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-bold text-sm" />
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Amount (₹)</label>
                                                <input type="number" placeholder="0" value={ms.amount} onChange={e => editMilestone(idx, 'amount', e.target.value)} className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-sm text-indigo-700" />
                                            </div>
                                            <div className="col-span-1 flex items-end pb-2">
                                                <button onClick={() => removeMilestone(idx)} className="h-10 w-10 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl flex items-center justify-center font-black transition-colors">×</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={`mt-auto p-8 rounded-[2rem] border-2 transition-all ${balanceRemaining === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${balanceRemaining === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Financial Reconciliation</p>
                                            <p className="text-sm font-bold text-slate-600 mt-1">Total defined must equal <span className="font-extrabold text-slate-900">₹{finalTotal.toLocaleString()}</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-2xl font-black ${balanceRemaining === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {balanceRemaining === 0 ? "✓ Fully Scheduled" : `₹${balanceRemaining.toLocaleString()} Difference`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 5 && (

                            <div className="flex-1 flex flex-col items-center justify-center space-y-12 animate-slide-up relative z-10">
                                <div className="text-center space-y-4">
                                    <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-xl"><svg className="h-10 w-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Audit / KYC Proof</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Upload scan of signed manual form</p>
                                </div>
                                <div onClick={() => document.getElementById('py-up')?.click()} className="w-full max-w-sm aspect-square border-4 border-dashed border-slate-100 rounded-[4rem] bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 transition-all group">
                                    {photo ? (
                                        <div className="text-center p-8 bg-emerald-50 rounded-3xl"><p className="font-black text-emerald-600 uppercase text-xs truncate max-w-[200px]">{photo.name}</p></div>
                                    ) : (
                                        <p className="text-slate-300 font-black group-hover:text-indigo-400 transition-all uppercase tracking-widest text-[10px]">Attach File</p>
                                    )}
                                </div>
                                <input id="py-up" type="file" className="hidden" onChange={e => setPhoto(e.target.files?.[0] || null)} />
                            </div>
                        )}

                        <div className="mt-auto pt-14 border-t border-slate-50 flex justify-between gap-6">
                            {step > 1 && <button onClick={() => setStep(step - 1)} className="px-14 py-5 bg-slate-50 text-slate-400 font-black rounded-3xl uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Back</button>}
                            <div className="flex-1" />
                            {step < 5 ? (
                                <button onClick={() => setStep(step + 1)} disabled={(step === 1 && !selectedUnitId) || (step === 4 && balanceRemaining !== 0)} className="px-16 py-5 bg-indigo-600 text-white font-black rounded-[2rem] uppercase text-[10px] tracking-[0.4em] shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-slate-200">Next</button>
                            ) : (
                                <button onClick={handleCreateBooking} className="px-16 py-5 bg-emerald-600 text-white font-black rounded-[2rem] uppercase text-[10px] tracking-[0.4em] shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all">Confirm</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

