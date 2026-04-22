"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function CreateLeadPage() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [sourceId, setSourceId] = useState("");
    const [projectId, setProjectId] = useState("");
    const [assignedToId, setAssignedToId] = useState("");
    const [budget, setBudget] = useState("");

    const [sources, setSources] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    useEffect(() => {
        async function loadOptions() {
            try {
                const [srcRes, usrRes, projRes] = await Promise.all([
                    api.get("/leads/sources"),
                    api.get("/auth/users").catch(() => null),
                    api.get("/projects")
                ]);

                if (srcRes.ok) setSources(await srcRes.json());
                if (usrRes?.ok) setUsers(await usrRes.json());
                if (projRes.ok) setProjects(await projRes.json());
            } catch (e) {
                console.error("Failed to load form options", e);
            }
        }
        loadOptions();
    }, []);

    const capitalize = (val: string) => val.charAt(0).toUpperCase() + val.slice(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post("/leads", {
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                phone: phone,
                source_id: sourceId ? parseInt(sourceId) : null,
                project_id: projectId ? parseInt(projectId) : null,
                assigned_to_id: assignedToId ? parseInt(assignedToId) : null,
                budget: budget ? parseFloat(budget.replace(/,/g, '')) : null,
            });

            if (res.ok) {
                const newLead = await res.json();
                router.push(`/dashboard/leads/${newLead.id}`);
            } else {
                const err = await res.json();
                alert(err.detail || "Failed to create lead");
            }
        } catch (err) {
            alert("An error occurred. Please check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8 animate-fade-in">
            <div className="flex items-center space-x-4 mb-8">
                <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">←</button>
                <h1 className="text-2xl font-bold text-slate-900">Add New Prospective Lead</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">First Name</label>
                        <input
                            required
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(capitalize(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="e.g. Rahul"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Name (Optional)</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(capitalize(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="e.g. Sharma"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                        <input
                            required
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="e.g. 9876543210"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget (INR)</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={budget ? new Intl.NumberFormat('en-IN').format(parseFloat(budget.replace(/,/g, ''))) : ""}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/,/g, '');
                                if (raw === "" || !isNaN(parseFloat(raw))) {
                                    setBudget(raw);
                                }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="e.g. 5,000,000"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address (Optional)</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="e.g. rahul@example.com"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interested Project</label>
                        <select
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none"
                        >
                            <option value="">Select Project</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Source</label>
                        <select
                            value={sourceId}
                            onChange={(e) => setSourceId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none"
                        >
                            <option value="">Select Source</option>
                            {sources.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assign To</label>
                    <select
                        value={assignedToId}
                        onChange={(e) => setAssignedToId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none"
                    >
                        <option value="">Unassigned</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                        ))}
                    </select>
                </div>

                <div className="pt-4">
                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50"
                    >
                        {loading ? "Registering Lead..." : "Create Lead"}
                    </button>
                    <p className="text-center text-slate-400 text-xs mt-4 uppercase tracking-tighter">Verified record generation session active</p>
                </div>
            </form>
        </div>
    );
}
