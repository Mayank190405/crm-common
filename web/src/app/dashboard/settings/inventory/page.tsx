"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function InventorySettingsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddProject, setShowAddProject] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        location: ""
    });

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        try {
            const res = await api.get("/projects");
            if (res.ok) setProjects(await res.json());
        } catch (e) {
            console.error("Failed to load projects", e);
        } finally {
            setLoading(false);
        }
    }

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post("/projects", formData);
            if (res.ok) {
                alert("Real Estate Project Initialized!");
                setFormData({ name: "", location: "" });
                setShowAddProject(false);
                loadProjects();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) {
            alert("Network protocol failure");
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    Portfolio Management
                </h2>
                <button
                    onClick={() => setShowAddProject(true)}
                    className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                >
                    Expand Portfolio
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400">Scanning satellite assets...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map((p) => (
                        <div key={p.id} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl group hover:border-indigo-400 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1">Project ID: PRJ-{p.id}</p>
                                    <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1">
                                        📍 {p.location}
                                    </p>
                                </div>
                                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm group-hover:scale-110 transition-transform">
                                    🏢
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <div className="flex-1 p-3 bg-white rounded-xl border border-slate-100">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Total Towers</p>
                                    <p className="font-bold text-slate-800">{p.towers?.length || 0}</p>
                                </div>
                                <div className="flex-1 p-3 bg-indigo-600 rounded-xl shadow-md cursor-pointer hover:bg-indigo-700 transition-colors flex items-center justify-center text-[10px] font-black text-white uppercase tracking-widest">
                                    Manage Assets
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddProject && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase">Initialize Project</h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Register new property territory</p>
                            </div>
                            <button onClick={() => setShowAddProject(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g. Skyline Heights Phase II"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Location</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="City, State, Country"
                                />
                            </div>

                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-1 italic">Intelligence Note:</p>
                                <p className="text-[10px] text-emerald-600 leading-relaxed font-medium">Once initialized, you can perform bulk CSV inventory ingestion for Towers and Units from the Inventory Command Center.</p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 uppercase tracking-widest transition-all mt-4"
                            >
                                Provision Project
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
