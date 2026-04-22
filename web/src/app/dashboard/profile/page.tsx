"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        designation: "",
        bio: "",
        role: "",
        permissions: {}
    });
    const [resetData, setResetData] = useState({
        old_password: "",
        new_password: "",
        confirm_password: ""
    });
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get("/auth/me");
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setFormData({
                    full_name: data.full_name || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    designation: data.designation || "",
                    bio: data.bio || "",
                    role: data.role || "",
                    permissions: data.permissions || {}
                });
            }
        } catch (e) {
            console.error("Failed to fetch profile", e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.patch("/auth/me", formData);
            if (res.ok) {
                alert("Profile updated successfully!");
                fetchProfile();
            } else {
                const err = await res.json();
                alert(`Update failed: ${err.detail}`);
            }
        } catch (e) {
            alert("Network error during profile update");
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (resetData.new_password !== resetData.confirm_password) {
            alert("Passwords do not match!");
            return;
        }
        setResetting(true);
        try {
            const res = await api.post("/auth/reset-password", {
                old_password: resetData.old_password,
                new_password: resetData.new_password
            });
            if (res.ok) {
                alert("Password changed successfully!");
                setResetData({ old_password: "", new_password: "", confirm_password: "" });
            } else {
                const err = await res.json();
                alert(`Update failed: ${err.detail}`);
            }
        } catch (e) {
            alert("Network error during security update");
        } finally {
            setResetting(false);
        }
    };

    if (loading) return <div className="p-8 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Profile...</div>;

    if (!user) return <div className="p-8 text-rose-500 font-bold uppercase tracking-widest text-[10px]">User Not Found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

                <div className="relative flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-3xl font-black shadow-xl shadow-indigo-500/20">
                        {user.full_name.charAt(0)}
                    </div>

                    <div className="flex-1 space-y-2">
                        <h1 className="text-3xl font-black uppercase tracking-tight leading-none">{user.full_name}</h1>
                        <p className="text-indigo-300 font-bold text-sm uppercase tracking-widest flex items-center gap-2 justify-center md:justify-start">
                            {user.role.replace('_', ' ')}
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 opacity-50"></span>
                            {user.designation || "Executive Portfolio"}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                            {user.permissions && Object.entries(user.permissions as Record<string, boolean>).map(([key, val]) => val ? (
                                <span key={key} className="text-[8px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded-md uppercase tracking-widest text-slate-400">
                                    {key.split('_')[1]} Access
                                </span>
                            ) : null)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-3 gap-8">
                {/* Profile Form */}
                <div className="md:col-span-2 space-y-8">
                    <form onSubmit={handleUpdate} className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Profile Details
                        </h3>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    Phone Number
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="+91..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                Email Address
                            </label>
                            <input
                                type="text"
                                disabled
                                value={formData.email}
                                className="w-full bg-slate-50/50 border border-slate-100 px-5 py-3 rounded-2xl text-sm font-bold text-slate-400 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                Job Title
                            </label>
                            <input
                                type="text"
                                value={formData.designation}
                                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Senior Sales Executive"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                About Agent
                            </label>
                            <textarea
                                rows={4}
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                                placeholder="Describe your real estate expertise..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-indigo-600 font-black text-white py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </form>

                    {/* Security Section */}
                    <form onSubmit={handleResetPassword} className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                            Change Password
                        </h3>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Current Password
                            </label>
                            <input
                                type="password"
                                required
                                value={resetData.old_password}
                                onChange={(e) => setResetData({ ...resetData, old_password: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={resetData.new_password}
                                    onChange={(e) => setResetData({ ...resetData, new_password: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={resetData.confirm_password}
                                    onChange={(e) => setResetData({ ...resetData, confirm_password: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={resetting}
                            className="w-full bg-slate-900 font-black text-white py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                        >
                            {resetting ? "Changing Password..." : "Update Password"}
                        </button>
                    </form>
                </div>

                {/* Sidebar Stats/Info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Account Verification</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">ID Reference</span>
                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">#{user.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Status</span>
                                <span className="text-[10px] font-black text-emerald-500 uppercase">Active</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Access Role</span>
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{user.role}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50 rounded-[2rem] p-8 border border-indigo-100/50">
                        <p className="text-[10px] font-bold text-indigo-600/60 uppercase tracking-widest leading-relaxed">
                            Your identity profile is synchronized across the entire Krads Real Estate network. Ensure your contact details are verified for inventory notifications.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
