"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminAuditPage() {
    const [performance, setPerformance] = useState<any[]>([]);
    const [unassignedLeads, setUnassignedLeads] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [sources, setSources] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("performance");
    
    // Filters
    const [filterProject, setFilterProject] = useState("");
    const [filterSource, setFilterSource] = useState("");

    // Bulk state
    const [transferFrom, setTransferFrom] = useState("");
    const [transferTo, setTransferTo] = useState("");
    const [assignTo, setAssignTo] = useState("");
    const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
    const [newSourceName, setNewSourceName] = useState("");

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [perfRes, unassRes, userRes, sourceRes, projRes] = await Promise.all([
                    api.get("/reports/employee-performance?days=90"),
                    api.get("/leads/unassigned"),
                    api.get("/auth/users"),
                    api.get("/leads/sources"),
                    api.get("/projects?limit=500")
                ]);
                
                if (perfRes.ok) setPerformance(await perfRes.json());
                if (unassRes.ok) setUnassignedLeads(await unassRes.json());
                if (userRes.ok) setUsers(await userRes.json());
                if (sourceRes.ok) setSources(await sourceRes.json());
                if (projRes.ok) setProjects(await projRes.json());
            } catch (err) {
                console.error("Audit load failed", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const filteredUnassigned = unassignedLeads.filter(l => {
        const matchProject = !filterProject || l.project_id === parseInt(filterProject);
        const matchSource = !filterSource || l.source_id === parseInt(filterSource);
        return matchProject && matchSource;
    });

    const handleBulkTransfer = async () => {
        if (!transferFrom || !transferTo) return alert("Select both users");
        if (transferFrom === transferTo) return alert("Source and Target must be different");
        
        if (!confirm("CRITICAL: This will move all leads and bookings. Proceed?")) return;
        
        try {
            const res = await api.post("/leads/bulk-transfer", {
                from_user_id: parseInt(transferFrom),
                to_user_id: parseInt(transferTo)
            });
            if (res.ok) {
                alert("Transfer Complete");
                window.location.reload();
            }
        } catch (e) { alert("Transfer Protocol Failed"); }
    };

    const handleBulkAssign = async () => {
        if (!assignTo || selectedLeads.length === 0) return alert("Select user and leads");
        
        try {
            const res = await api.post("/leads/bulk-assign", {
                lead_ids: selectedLeads,
                to_user_id: parseInt(assignTo)
            });
            if (res.ok) {
                alert(`Assigned ${selectedLeads.length} leads successfully`);
                window.location.reload();
            }
        } catch (e) { alert("Assignment Failed"); }
    };

    const handleAddSource = async () => {
        if (!newSourceName) return;
        try {
            const res = await api.post("/leads/sources", { name: newSourceName });
            if (res.ok) {
                setSources([...sources, await res.json()]);
                setNewSourceName("");
            }
        } catch (e) { }
    };

    if (loading) return <div className="p-8">Synchronizing Admin Matrix...</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">ADMIN AUDIT CENTRE</h1>
                    <p className="text-slate-500 font-medium">Global Operations & Resource Management</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {["performance", "bulk", "unassigned", "sources"].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            {activeTab === "performance" && (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Employee KPI Matrix (Last 90 Days)</h2>
                        <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">Active Data Stream</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Member</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads Managed</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">90D New</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visits</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bookings</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Conversion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {performance.map(p => (
                                    <tr key={p.employee_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-slate-800">{p.employee_name}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{p.role}</p>
                                        </td>
                                        <td className="px-8 py-5 font-black text-slate-600">{p.leads_managed}</td>
                                        <td className="px-8 py-5">
                                            <span className="text-indigo-600 font-black">{p.new_leads_period}</span>
                                        </td>
                                        <td className="px-8 py-5 font-black text-amber-600">{p.visits_scheduled}</td>
                                        <td className="px-8 py-5 font-black text-emerald-600">{p.bookings_closed}</td>
                                        <td className="px-8 py-5">
                                            <p className="font-black text-slate-900">₹{p.revenue.toLocaleString()}</p>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="inline-flex items-center space-x-2">
                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(p.conversion_rate * 2, 100)}%` }}></div>
                                                </div>
                                                <span className="font-black text-indigo-600 text-xs">{p.conversion_rate}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "bulk" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 20 20"><path d="M8 5a1 1 0 100 2h5.586L1.293 19.293a1 1 0 101.414 1.414L15 8.414V14a1 1 0 102 0V5a1 1 0 00-1-1H8z" /></svg>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight mb-2">Bulk Asset Transfer</h2>
                        <p className="text-slate-400 text-sm mb-10">Move all lead ownership and bookings between employees instantly.</p>
                        
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Source Employee (Leaving)</label>
                                <select 
                                    value={transferFrom}
                                    onChange={e => setTransferFrom(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-2xl text-base font-bold text-white outline-none focus:border-indigo-500 transition-all"
                                >
                                    <option value="" className="text-slate-900">-- Choose User --</option>
                                    {users.map(u => <option key={u.id} value={u.id} className="text-slate-900">{u.full_name} ({u.role})</option>)}
                                </select>
                            </div>

                            <div className="flex justify-center py-2">
                                <span className="bg-indigo-500/20 p-3 rounded-full text-indigo-400">⬇️</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Target Employee (Receiving)</label>
                                <select 
                                    value={transferTo}
                                    onChange={e => setTransferTo(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-2xl text-base font-bold text-white outline-none focus:border-indigo-500 transition-all"
                                >
                                    <option value="" className="text-slate-900">-- Choose User --</option>
                                    {users.map(u => <option key={u.id} value={u.id} className="text-slate-900">{u.full_name} ({u.role})</option>)}
                                </select>
                            </div>

                            <button 
                                onClick={handleBulkTransfer}
                                className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-xl shadow-black/20"
                            >
                                EXECUTE MIGRATION
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Team Overview</h2>
                        <p className="text-slate-500 text-sm mb-8">Quick snapshot of current workload distribution.</p>
                        
                        <div className="space-y-4">
                            {performance.map(p => (
                                <div key={p.employee_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-800">{p.employee_name}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.role}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-slate-900">{p.leads_managed}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Leads Active</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "unassigned" && (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                    <div className="p-8 border-b border-slate-50 space-y-6 bg-slate-50/50">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Unassigned Lead Intake</h2>
                                <p className="text-xs text-slate-500 font-medium">Select leads and assign them to a team member in bulk.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <select 
                                    value={assignTo}
                                    onChange={e => setAssignTo(e.target.value)}
                                    className="bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                >
                                    <option value="">-- Assign To... --</option>
                                    {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                                </select>
                                <button 
                                    onClick={handleBulkAssign}
                                    disabled={selectedLeads.length === 0 || !assignTo}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    Assign {selectedLeads.length} Leads
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 pb-2">
                            <div className="flex-1 max-w-xs">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Filter Project</label>
                                <select 
                                    value={filterProject}
                                    onChange={e => setFilterProject(e.target.value)}
                                    className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                >
                                    <option value="">All Projects</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 max-w-xs">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1">Filter Source</label>
                                <select 
                                    value={filterSource}
                                    onChange={e => setFilterSource(e.target.value)}
                                    className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                >
                                    <option value="">All Sources</option>
                                    {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="mt-auto">
                                <button 
                                    onClick={() => { setFilterProject(""); setFilterSource(""); }}
                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest px-4 py-2.5"
                                >
                                    Clear Matrix
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-8 py-4 w-10">
                                        <input 
                                            type="checkbox" 
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedLeads(filteredUnassigned.map(l => l.id));
                                                else setSelectedLeads([]);
                                            }}
                                            checked={selectedLeads.length > 0 && selectedLeads.length === filteredUnassigned.length}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                                        />
                                    </th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Identity</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project / Source</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Info</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inflow Date</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUnassigned.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold italic">
                                            No leads match the current filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUnassigned.map(l => (
                                        <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-5">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedLeads.includes(l.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedLeads([...selectedLeads, l.id]);
                                                        else setSelectedLeads(selectedLeads.filter(id => id !== l.id));
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                                                />
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="font-bold text-slate-800">{l.first_name} {l.last_name}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ID: LEAD-{l.id}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-xs font-bold text-slate-700">{l.project?.name || "No Project"}</p>
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{l.source_ref?.name || "Unknown Source"}</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-sm font-bold text-slate-600">{l.phone}</p>
                                                <p className="text-xs text-slate-400">{l.email || "No Email"}</p>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-slate-500 text-sm">
                                                {new Date(l.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                                    {l.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "sources" && (
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl overflow-hidden max-w-2xl mx-auto">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Lead Source Management</h2>
                    <p className="text-slate-500 text-sm mb-10">Define custom marketing sources to track campaign performance.</p>
                    
                    <div className="space-y-8">
                        <div className="flex gap-4">
                            <input 
                                type="text"
                                value={newSourceName}
                                onChange={e => setNewSourceName(e.target.value)}
                                placeholder="e.g. Instagram Ads 2024"
                                className="flex-1 bg-slate-50 border-2 border-slate-100 px-6 py-4 rounded-2xl text-base font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                            />
                            <button 
                                onClick={handleAddSource}
                                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                Add Source
                            </button>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Configured Protocols</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {sources.map(s => (
                                    <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                        <span className="font-bold text-slate-700">{s.name}</span>
                                        <span className="text-[9px] font-black bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">ID: {s.id}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
