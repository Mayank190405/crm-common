"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        password: "",
        role: "sales_agent",
        is_active: true,
        phone: "",
        designation: "",
        bio: "",
        permissions: {
            access_leads: true,
            access_inventory: true,
            access_bookings: true,
            access_financials: false,
            access_reports: false,
            access_settings: false,
        }
    });

    const [currentUser, setCurrentUser] = useState<any>(null);

    const permissionFlags = [
        { id: 'access_leads', label: 'Lead Management' },
        { id: 'access_inventory', label: 'Inventory List' },
        { id: 'access_bookings', label: 'Bookings' },
        { id: 'access_financials', label: 'Financials' },
        { id: 'access_reports', label: 'Reports' },
        { id: 'access_settings', label: 'System Settings' },
    ];

    useEffect(() => {
        loadUsers();
        fetchMe();
    }, []);

    async function fetchMe() {
        try {
            const res = await api.get("/auth/me");
            if (res.ok) setCurrentUser(await res.json());
        } catch (e) { }
    }

    async function loadUsers() {
        try {
            const res = await api.get("/auth/users");
            if (res.ok) setUsers(await res.json());
        } catch (e) {
            console.error("Failed to load users", e);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = isEditMode ? `/auth/users/${editingUserId}` : "/auth/users";
            const method = isEditMode ? "patch" : "post";

            // For patch, we might not want to send password if empty
            const payload = { ...formData };
            if (isEditMode && !formData.password) {
                delete (payload as any).password;
            }

            const res = await (api as any)[method](url, payload);
            if (res.ok) {
                alert(isEditMode ? "User updated successfully!" : "User created successfully!");
                closeModal();
                loadUsers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) {
            alert("Network error processing user");
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setIsEditMode(false);
        setEditingUserId(null);
        setFormData({
            full_name: "",
            email: "",
            password: "",
            role: "sales_agent",
            is_active: true,
            phone: "",
            designation: "",
            bio: "",
            permissions: {
                access_leads: true,
                access_inventory: true,
                access_bookings: true,
                access_financials: false,
                access_reports: false,
                access_settings: false,
            }
        });
    };

    const openEditModal = (user: any) => {
        setIsEditMode(true);
        setEditingUserId(user.id);
        setFormData({
            full_name: user.full_name || "",
            email: user.email || "",
            password: "", // Don't show hashed password
            role: user.role || "sales_agent",
            is_active: user.is_active ?? true,
            phone: user.phone || "",
            designation: user.designation || "",
            bio: user.bio || "",
            permissions: user.permissions || {
                access_leads: true,
                access_inventory: true,
                access_bookings: true,
                access_financials: false,
                access_reports: false,
                access_settings: false,
            }
        });
        setShowAddModal(true);
    };

    const handleDeleteUser = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this agent account? This action is irreversible.")) return;
        try {
            const res = await api.delete(`/auth/users/${id}`);
            if (res.ok) {
                loadUsers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) {
            alert("Delete failed");
        }
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                    User Management
                </h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                >
                    Add New User
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400">Loading agents...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Full Name</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Email Address</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Role & Designation</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Contact Info</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Permissions</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">ID & Status</th>
                                <th className="pb-4 text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-4 font-bold text-slate-800 text-sm whitespace-nowrap">{u.full_name}</td>
                                    <td className="py-4 px-4 font-medium text-slate-600 text-sm whitespace-nowrap">{u.email}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded w-fit ${u.role === 'super_admin' ? 'bg-purple-50 text-purple-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {u.role.replace('_', ' ')}
                                            </span>
                                            {u.designation && <span className="text-[10px] text-slate-400 mt-1 pl-2 font-bold">{u.designation}</span>}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 font-medium text-slate-500 text-xs">
                                        {u.phone || 'No phone'}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex flex-wrap gap-1">
                                            {u.permissions && Object.entries(u.permissions).map(([key, val]) => val && (
                                                <span key={key} className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                                    {key.split('_')[1]}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-300">#{u.id}</span>
                                            {u.is_active ? (
                                                <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Active</span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Inactive</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                                            >
                                                Edit
                                            </button>
                                            {currentUser?.id !== u.id && (
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase">
                                    {isEditMode ? "Edit Agent Details" : "Add New Agent"}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                    {isEditMode ? `Updating ID #${editingUserId}` : "Grant account access"}
                                </p>
                            </div>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="agent@krads.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {isEditMode ? "New Password (Leave blank to keep)" : "Initial Password"}
                                    </label>
                                    <input
                                        type="password"
                                        required={!isEditMode}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="+91..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Title</label>
                                <input
                                    type="text"
                                    value={formData.designation}
                                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Senior Sales Consultant"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="sales_agent">Sales Agent</option>
                                    <option value="admin">Administrator</option>
                                    <option value="super_admin">Super Admin</option>
                                    <option value="accounts">Accounts Manager</option>
                                    <option value="telecaller">Telecaller</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">About Agent</label>
                                <textarea
                                    rows={2}
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                                    placeholder="Brief professional background..."
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Permissions</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {permissionFlags.map((flag) => (
                                        <div
                                            key={flag.id}
                                            onClick={() => setFormData({
                                                ...formData,
                                                permissions: {
                                                    ...formData.permissions,
                                                    [flag.id]: !((formData.permissions as any)[flag.id])
                                                }
                                            })}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${(formData.permissions as any)[flag.id]
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                : 'bg-slate-50 border-slate-100 text-slate-400'
                                                }`}
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-tight">{flag.label}</span>
                                            <div className={`w-2 h-2 rounded-full ${(formData.permissions as any)[flag.id] ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-300'}`}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 uppercase tracking-widest transition-all mt-4"
                            >
                                {isEditMode ? "Save Changes" : "Add Agent"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
