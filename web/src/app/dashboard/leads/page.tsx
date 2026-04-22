"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LeadsPage() {
    const [leadsData, setLeadsData] = useState<any>({ items: [], total: 0, page: 1, size: 10, pages: 0 });
    const [page, setPage] = useState(1);
    const [size] = useState(10);
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newSourceName, setNewSourceName] = useState("");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [previewLeads, setPreviewLeads] = useState<any[]>([]);
    const [assigneeId, setAssigneeId] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    // Filtering State
    const [filterProject, setFilterProject] = useState("");
    const [filterSource, setFilterSource] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterOwner, setFilterOwner] = useState("");
    const [projects, setProjects] = useState<any[]>([]);
    const [sources, setSources] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [showStagesModal, setShowStagesModal] = useState(false);
    const [newStageName, setNewStageName] = useState("");
    const [newStageSlug, setNewStageSlug] = useState("");
    const [newStageColor, setNewStageColor] = useState("blue");
    const [searchTerm, setSearchTerm] = useState("");

    const router = useRouter();

    const loadLeads = async (currentPage = page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append("page", currentPage.toString());
            params.append("size", size.toString());
            if (filterProject) params.append("project_id", filterProject);
            if (filterStatus) params.append("status", filterStatus);
            if (filterSource) params.append("source_id", filterSource);
            if (filterOwner) params.append("assigned_to_id", filterOwner);
            if (searchTerm) params.append("search", searchTerm);
            
            const res = await api.get(`/leads?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLeadsData(data);
            }
        } catch (err) {
            console.error("Failed to load leads", err);
        } finally {
            setLoading(false);
        }
    };

    const loadOptions = async () => {
        try {
            const [projRes, srcRes, userRes, stageRes] = await Promise.all([
                api.get("/projects"),
                api.get("/leads/sources"),
                api.get("/auth/users"),
                api.get("/leads/config/stages")
            ]);
            if (projRes.ok) setProjects(await projRes.json());
            if (srcRes.ok) setSources(await srcRes.json());
            if (stageRes.ok) setStages(await stageRes.json());
            if (userRes.ok) {
                const data = await userRes.json();
                setAgents(data.filter((u: any) => u.role === "sales_agent" || u.role === "telecaller"));
            }
        } catch (err) {
            console.error("Failed to load options", err);
        }
    };

    useEffect(() => {
        loadLeads(page);
    }, [page, filterProject, filterStatus, filterSource, filterOwner, searchTerm]);

    useEffect(() => {
        loadOptions();
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setUploadFile(file);
        setPreviewLeads([]);

        if (file) {
            setIsPreviewLoading(true);
            const formData = new FormData();
            formData.append("file", file);
            try {
                const res = await api.upload("/leads/preview-upload", formData);
                if (res.ok) {
                    const data = await res.json();
                    setPreviewLeads(data.preview || []);
                }
            } catch (err) {
                console.error("Preview failed", err);
            } finally {
                setIsPreviewLoading(false);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} leads?`)) return;
        setIsDeleting(true);
        try {
            const res = await api.post("/leads/bulk-delete", selectedIds);
            if (res.ok) {
                setSelectedIds([]);
                loadLeads();
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUploadSubmit = async () => {
        if (!uploadFile) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", uploadFile);
        if (assigneeId) formData.append("assigned_to_id", assigneeId);

        try {
            const res = await api.upload("/leads/bulk-upload", formData);
            if (res.ok) {
                const data = await res.json();
                alert(data.msg);
                setShowUploadModal(false);
                setUploadFile(null);
                setPreviewLeads([]);
                setAssigneeId("");
                loadLeads();
            } else {
                alert("Upload failed");
            }
        } catch (err) {
            alert("An error occurred during upload");
        } finally {
            setIsUploading(false);
        }
    };

    const handleBulkAssignUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        const res = await api.upload("/leads/bulk-assign", formData);
        if (res.ok) {
            const data = await res.json();
            alert(data.msg);
            loadLeads();
        } else {
            alert("Assignment upload failed");
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        const params = new URLSearchParams();
        if (filterProject) params.append("project_id", filterProject);
        if (filterSource) params.append("source_id", filterSource);

        try {
            const res = await api.get(`/leads/export/csv?${params.toString()}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert("Export failed: Please login again.");
            }
        } catch (err) {
            console.error("Export failure", err);
            alert("An error occurred during CSV export.");
        } finally {
            setIsExporting(false);
        }
    };
    
    // We handle filtering via server-side pagination now
    const filteredLeads = Array.isArray(leadsData.items) ? leadsData.items : [];

    const handleAddStage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post("/leads/config/stages", {
                name: newStageName,
                slug: newStageSlug || newStageName.toLowerCase().replace(/\s+/g, '_'),
                color: newStageColor,
                display_order: stages.length
            });
            if (res.ok) {
                setNewStageName("");
                setNewStageSlug("");
                const updated = await api.get("/leads/config/stages");
                if (updated.ok) setStages(await updated.json());
            }
        } catch (err) {
            console.error("Failed to add stage", err);
        }
    };

    const handleDeleteStage = async (id: number) => {
        if (!confirm("Are you sure? This won't delete leads, but they might show as 'unknown' status if you haven't reassigned them.")) return;
        try {
            const res = await api.delete(`/leads/config/stages/${id}`);
            if (res.ok) {
                const updated = await api.get("/leads/config/stages");
                if (updated.ok) setStages(await updated.json());
            }
        } catch (err) {
            console.error("Delete failed", err);
        }
    };
    const handleAddSource = async () => {
        const res = await api.post("/leads/sources", { name: newSourceName });
        if (res.ok) {
            setShowSourceModal(false);
            setNewSourceName("");
            alert("Source added successfully");
            loadOptions();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative max-w-[1600px] gap-4">
            <div className="flex items-center justify-between bg-white px-6 py-4 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Leads</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capture and manage prospective acquisitions</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="hidden lg:flex items-center bg-slate-50 border border-slate-200 rounded px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input 
                            type="text" 
                            placeholder="Search leads..." 
                            className="bg-transparent border-none outline-none text-[11px] font-medium text-slate-600 placeholder:text-slate-400 w-48" 
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setPage(1);}}
                        />
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded font-bold text-[10px] tracking-widest hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        {isExporting && <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />}
                        {isExporting ? "EXPORTING..." : "EXPORT"}
                    </button>
                    <button
                        onClick={() => setShowStagesModal(true)}
                        className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded font-bold text-[10px] tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        MANAGE STAGES
                    </button>
                    <button
                        onClick={() => router.push("/dashboard/leads/create")}
                        className="bg-blue-600 text-white px-5 py-2 rounded font-bold text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                        + NEW LEAD
                    </button>
                </div>
            </div>

            {/* Filter & Control Bar - Zoho Style */}
            <div className="flex flex-wrap items-center gap-4 bg-white px-6 py-3 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex items-center space-x-4 border-r border-slate-100 pr-6">
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="text-blue-600 text-[10px] font-bold uppercase tracking-widest hover:underline transition-all"
                    >
                        Bulk Import
                    </button>
                    <label className="text-slate-500 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-slate-800 transition-all">
                        Bulk Assign
                        <input type="file" className="hidden" onChange={handleBulkAssignUpload} accept=".csv,.xlsx" />
                    </label>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 border-r border-slate-100 pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project:</span>
                        <select
                            value={filterProject}
                            onChange={(e) => {setFilterProject(e.target.value); setPage(1);}}
                            className="text-[10px] font-bold text-slate-600 bg-transparent outline-none cursor-pointer uppercase tracking-tight"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2 border-r border-slate-100 pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner:</span>
                        <select
                            value={filterOwner}
                            onChange={(e) => {setFilterOwner(e.target.value); setPage(1);}}
                            className="text-[10px] font-bold text-slate-600 bg-transparent outline-none cursor-pointer uppercase tracking-tight"
                        >
                            <option value="">All Owners</option>
                            {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2 border-r border-slate-100 pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source:</span>
                        <select
                            value={filterSource}
                            onChange={(e) => {setFilterSource(e.target.value); setPage(1);}}
                            className="text-[10px] font-bold text-slate-600 bg-transparent outline-none cursor-pointer uppercase tracking-tight"
                        >
                            <option value="">All Sources</option>
                            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status:</span>
                        <select
                            value={filterStatus}
                            onChange={(e) => {setFilterStatus(e.target.value); setPage(1);}}
                            className="text-[10px] font-bold text-slate-600 bg-transparent outline-none cursor-pointer uppercase tracking-tight"
                        >
                            <option value="">All Status</option>
                            {stages.map(s => (
                                <option key={s.slug} value={s.slug}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className="ml-auto flex items-center space-y-0 space-x-4 bg-blue-50/50 px-4 py-2 rounded border border-blue-100 animate-in slide-in-from-right-4">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedIds.length} SELECTED</span>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="bg-white text-rose-600 px-3 py-1.5 rounded border border-rose-200 text-[9px] font-bold uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {isDeleting && <div className="w-3 h-3 border-2 border-rose-200 border-t-rose-600 rounded-full animate-spin" />}
                            {isDeleting ? "DELETING..." : "DELETE"}
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer bg-white"
                                        onChange={(e) => setSelectedIds(e.target.checked ? leadsData.items.map((l: any) => l.id) : [])}
                                        checked={selectedIds.length === leadsData.items.length && leadsData.items.length > 0}
                                    />
                                </th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lead Name</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lead Owner</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lead Source</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Next Follow-up</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lead Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Created Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={9} className="text-center py-32 bg-white">
                                    <div className="flex flex-col items-center">
                                        <div className="w-8 h-8 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Scanning Repository...</span>
                                    </div>
                                </td></tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-32 text-slate-400 bg-white uppercase text-[10px] font-bold tracking-widest">No Leads Identified</td></tr>
                            ) : (
                                filteredLeads.map((lead: any) => (
                                    <tr
                                        key={lead.id}
                                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                        onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                                    >
                                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="accent-blue-600 rounded cursor-pointer bg-white border-slate-300"
                                                checked={selectedIds.includes(lead.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds([...selectedIds, lead.id]);
                                                    else setSelectedIds(selectedIds.filter(id => id !== lead.id));
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                                                    className="text-[12px] font-bold text-blue-600 hover:underline hover:text-blue-700 text-left transition-all uppercase tracking-tight"
                                                >
                                                    {lead.first_name} {lead.last_name}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                    {lead.assigned_to?.full_name?.charAt(0) || "U"}
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">
                                                    {lead.assigned_to?.full_name || "Unassigned"}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[11px] font-medium text-slate-600">{lead.project?.name || "-"}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[11px] font-medium text-slate-600 tabular-nums">{lead.phone || ""}</p>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] text-slate-500 font-medium">
                                            <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600">
                                                {lead.source_ref?.name || "Direct"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {lead.next_follow_up_at ? (
                                                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                    {new Date(lead.next_follow_up_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Dynamic Status Badge */}
                                            {(() => {
                                                const stage = stages.find(s => s.slug === lead.status);
                                                const colorClass = stage?.color || "slate";
                                                const colors: any = {
                                                    blue: "bg-blue-50 text-blue-700 border-blue-100",
                                                    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
                                                    orange: "bg-orange-50 text-orange-700 border-orange-100",
                                                    green: "bg-green-50 text-green-700 border-green-100",
                                                    red: "bg-red-50 text-red-700 border-red-100",
                                                    slate: "bg-slate-50 text-slate-700 border-slate-100",
                                                    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                };
                                                return (
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[colorClass] || colors.slate}`}>
                                                        {stage?.name || lead.status.replace(/_/g, " ")}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-[11px] text-slate-400 font-medium text-right tabular-nums">{new Date(lead.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Bar */}
                <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        SHOWING {((page - 1) * size) + 1} TO {Math.min(page * size, leadsData.total)} OF {leadsData.total} LEADS
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            PREV
                        </button>
                        <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(5, leadsData.pages) }, (_, i) => {
                                const p = page <= 3 ? i + 1 : Math.min(leadsData.pages, page + i - 2);
                                if (p > leadsData.pages) return null;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded text-[10px] font-bold transition-all ${page === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setPage(p => Math.min(leadsData.pages, p + 1))}
                            disabled={page === leadsData.pages || leadsData.pages === 0}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                        >
                            NEXT
                        </button>
                    </div>
                </div>
            </div>


            {/* Bulk Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 max-w-2xl w-full shadow-2xl rounded-lg animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Import Leads</h2>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Batch acquisition stream</p>
                                <div className="mt-4">
                                    <a 
                                        href={`${process.env.NEXT_PUBLIC_API_URL || "http://15.206.166.32:8000/api/v1"}/leads/sample-csv`}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-[9px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 uppercase tracking-widest transition-all shadow-sm"
                                        download
                                    >
                                        <span>📥</span>
                                        Download CSV Template
                                    </a>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div className="border border-dashed border-zinc-200 dark:border-zinc-700 p-10 rounded-lg text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group">
                                <input
                                    type="file"
                                    id="bulk-file"
                                    className="hidden"
                                    accept=".csv,.xlsx"
                                    onChange={handleFileSelect}
                                />
                                <label htmlFor="bulk-file" className="cursor-pointer block">
                                    <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <span className="text-lg">📁</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">{uploadFile ? uploadFile.name : "Choose CSV or Excel"}</p>
                                </label>
                            </div>

                            {(isPreviewLoading || previewLeads.length > 0) && (
                                <div className="bg-zinc-50 dark:bg-zinc-950/50 p-6 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                    <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Stream Head Preview</h3>
                                    {isPreviewLoading ? (
                                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest animate-pulse text-center py-4">Validating...</div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-[9px] uppercase font-bold text-zinc-600 dark:text-zinc-400">
                                                <thead>
                                                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                                        {Object.keys(previewLeads[0] || {}).map(key => (
                                                            <th key={key} className="pb-2 px-2">{key}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewLeads.map((row, i) => (
                                                        <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-white dark:hover:bg-zinc-900/50">
                                                            {Object.values(row).map((val: any, j) => (
                                                                <td key={j} className="py-2 px-2 whitespace-nowrap">{String(val)}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Default Assignee</label>
                                <select
                                    value={assigneeId}
                                    onChange={(e) => setAssigneeId(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-3 rounded-md outline-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                                >
                                    <option value="">Leave Unassigned</option>
                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleUploadSubmit}
                                disabled={!uploadFile || isUploading}
                                className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md font-bold uppercase tracking-widest text-[10px] border border-zinc-900 dark:border-zinc-100 hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                            >
                                {isUploading ? "Syncing..." : "Commit Stream"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Source Management Modal */}
            {showSourceModal && (
                <div className="fixed inset-0 bg-zinc-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 max-w-md w-full shadow-2xl rounded-lg animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Origin Channels</h2>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Configure entry points</p>
                            </div>
                            <button onClick={() => setShowSourceModal(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 block">Alias</label>
                                <input
                                    type="text"
                                    value={newSourceName}
                                    onChange={(e) => setNewSourceName(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-3 rounded-md outline-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                                    placeholder="e.g. Meta Ads, Referrals"
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => setShowSourceModal(false)}
                                    className="flex-1 px-4 py-3 font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white uppercase tracking-widest text-[9px] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddSource}
                                    className="flex-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 rounded-md font-bold uppercase tracking-widest text-[9px] border border-zinc-900 dark:border-zinc-100 hover:opacity-90 transition-all shadow-sm"
                                >
                                    Append
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showStagesModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Customize Lead Stages</h2>
                            <button onClick={() => setShowStagesModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        
                        <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2">
                            {stages.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full bg-${s.color}-500`} />
                                        <span className="font-bold text-slate-700">{s.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({s.slug})</span>
                                    </div>
                                    <button onClick={() => handleDeleteStage(s.id)} className="text-red-400 hover:text-red-600">🗑️</button>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleAddStage} className="space-y-4 pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Add New Stage</h3>
                            <input
                                required
                                value={newStageName}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setNewStageName(val.charAt(0).toUpperCase() + val.slice(1));
                                }}
                                placeholder="Stage Name (e.g. Site Visit Done)"
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <select 
                                    value={newStageColor} 
                                    onChange={(e) => setNewStageColor(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none"
                                >
                                    <option value="blue">Blue</option>
                                    <option value="indigo">Indigo</option>
                                    <option value="orange">Orange</option>
                                    <option value="green">Green</option>
                                    <option value="red">Red</option>
                                    <option value="slate">Slate</option>
                                    <option value="emerald">Emerald</option>
                                </select>
                                <button type="submit" className="bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">Add Stage</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
