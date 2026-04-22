"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useTheme } from "@/components/theme-provider";

const navItems = [
    {
        name: "Home", href: "/dashboard", icon: (
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
        )
    },
    {
        name: "Leads", href: "/dashboard/leads", icon: (
            <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a7 7 0 00-7 7v1h11v-1a7 7 0 00-7-7z" /></svg>
        ), permission: "access_leads"
    },
    {
        name: "Inventory", href: "/dashboard/inventory", icon: (
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
        ), permission: "access_inventory"
    },
    {
        name: "Bookings", href: "/dashboard/bookings", icon: (
            <svg className="w-5 h-5 text-rose-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
        ), permission: "access_bookings"
    },
    {
        name: "Financials", href: "/dashboard/financials", icon: (
            <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
        ), permission: "access_financials"
    },
    {
        name: "Reports", href: "/dashboard/reports", icon: (
            <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
        ), permission: "access_reports"
    },
    {
        name: "Performance", href: "/dashboard/performance", icon: (
            <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
        ), permission: "access_reports"
    },
    {
        name: "Settings", href: "/dashboard/settings", icon: (
            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
        ), permission: "access_settings"
    },
    {
        name: "Admin Audit", href: "/dashboard/admin", icon: (
            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.333 16.676 2 12.23 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        ), permission: "access_admin"
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [showQuickAction, setShowQuickAction] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const checkPermission = (item: any) => {
        if (!item.permission) return true;
        if (user?.role === 'admin') return true;
        return user?.permissions?.[item.permission] === true;
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "/login";
            return;
        }
        setIsAuthChecking(false);

        const savedUser = localStorage.getItem("user");
        if (savedUser) setUser(JSON.parse(savedUser));

        async function fetchInitialNotifs() {
            try {
                const res = await api.get("/notifications?limit=5");
                if (res.ok) setNotifications(await res.json());
            } catch (e) { }
        }
        fetchInitialNotifs();

        // WebSocket Integration & Sound
        if (token) {
            const getWsUrl = () => {
                if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
                const { hostname, protocol } = window.location;
                const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    return `ws://localhost:8000/api/v1`;
                }
                return `${wsProto}//${hostname}:8000/api/v1`;
            };
            const wsUrl = `${getWsUrl()}/ws?token=${token}`;
            const ws = new WebSocket(wsUrl);
            
            // Audio setup for alerts
            const alertSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");

            ws.onmessage = (event) => {
                const newNotif = JSON.parse(event.data);
                setNotifications(prev => [newNotif, ...prev.slice(0, 4)]);
                
                // Play notification sound
                alertSound.play().catch(e => console.log("Sound blocked by browser policy until interaction"));
                
                // 2. Browser Native Notification (Safely check if API exists)
                if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
                    new Notification(newNotif.title || "JD-CRM Alert", {
                        body: newNotif.message,
                        icon: "/favicon.ico"
                    });
                }
            };

            // Request browser notification permission (Safely check if API exists)
            if (typeof Notification !== 'undefined' && Notification.permission === "default") {
                Notification.requestPermission();
            }

            return () => ws.close();
        }
    }, []);

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await api.get(`/leads/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.ok) {
                    setSearchResults(await res.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const markRead = async (id: number) => {
        await api.patch(`/notifications/${id}/read`, {});
        setNotifications(notifications.filter(n => n.id !== id));
    };

    if (isAuthChecking) {
        return (
            <div className="h-screen w-full bg-slate-100 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Initializing Database</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden relative">
            {/* Mobile Menu Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30 lg:hidden transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:relative top-0 left-0 h-full bg-[#2c3e50] border-r border-white/10 flex flex-col z-40 transition-all duration-300 shadow-2xl
                    ${isCollapsed ? "w-16" : "w-64"}
                    ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                <div className={`h-14 flex items-center px-6 border-b border-white/5 ${isCollapsed ? "justify-center" : "justify-between"}`}>
                    <Link href="/dashboard" className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">K</div>
                        {!isCollapsed && <span className="text-sm font-bold text-white tracking-widest">KRADS</span>}
                    </Link>
                </div>

                <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {navItems.filter(checkPermission).map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={`flex items-center group px-4 py-2.5 transition-all duration-150 relative ${isActive
                                    ? "bg-white/10 text-white font-bold"
                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                    } ${isCollapsed ? "justify-center" : "space-x-4"}`}
                                title={isCollapsed ? item.name : ""}
                            >
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r"></div>}
                                <span className={`${isCollapsed ? "" : "opacity-80 group-hover:opacity-100"} transition-all`}>
                                    {item.icon}
                                </span>
                                {!isCollapsed && <span className="text-[13px] font-medium whitespace-nowrap">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-white/10">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex w-full items-center justify-center py-2 text-slate-400 hover:text-white transition-all"
                    >
                        <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                    <Link href="/dashboard/profile" className={`flex items-center rounded-lg transition-all group mt-2 ${isCollapsed ? "justify-center p-1" : "space-x-3 px-3 py-3 hover:bg-white/5"}`}>
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex shrink-0 items-center justify-center text-white text-[10px] font-bold shadow-sm">
                            {user?.full_name?.charAt(0) || "U"}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-white truncate">{user?.full_name || "User"}</p>
                                <p className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">{user?.role || "Agent"}</p>
                            </div>
                        )}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-100 overflow-hidden relative">
                <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-10 sticky top-0">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setIsMobileOpen(true)}
                            className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-md transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <h2 className="text-sm font-bold text-slate-800 tracking-tight">
                            {navItems.find(item => pathname === item.href)?.name || "Dashboard"}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-6 relative">
                        <div className="relative">
                            <div className="hidden lg:flex items-center bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-64 group focus-within:ring-2 focus-within:ring-blue-100 transition-all z-20">
                                <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input
                                    type="text"
                                    placeholder="Search entries..."
                                    className="bg-transparent border-none outline-none text-xs w-full text-slate-600 placeholder:text-slate-400"
                                    onClick={() => setShowSearch(true)}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Search Dropdown Modal */}
                            {showSearch && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowSearch(false)}></div>
                                    <div className="absolute top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Search</p>
                                        </div>
                                        <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {searchQuery.length < 2 ? (
                                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                                    <svg className="w-8 h-8 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                    <p className="text-xs font-medium">Type at least 2 characters to search...</p>
                                                </div>
                                            ) : isSearching ? (
                                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                                    <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
                                                    <p className="text-xs font-medium">Searching records...</p>
                                                </div>
                                            ) : searchResults.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                                    <p className="text-xs font-medium">No results found for "{searchQuery}"</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {searchResults.map((lead: any) => (
                                                        <Link
                                                            key={lead.id}
                                                            href={`/dashboard/leads/${lead.id}`}
                                                            onClick={() => setShowSearch(false)}
                                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                                                        >
                                                            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center font-bold text-xs shrink-0">
                                                                {lead.first_name?.[0] || "?"}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                                                    {lead.first_name} {lead.last_name}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] text-slate-500 truncate">{lead.email || lead.phone}</span>
                                                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{lead.status}</span>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowQuickAction(!showQuickAction)}
                                className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all active:scale-95 group relative z-20"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            </button>

                            {/* Quick Action Dropdown */}
                            {showQuickAction && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowQuickAction(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                        <div className="p-2 space-y-1">
                                            <Link href="/dashboard/leads/create" onClick={() => setShowQuickAction(false)} className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-colors group">
                                                <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-md group-hover:bg-emerald-100 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold">New Lead</p>
                                                    <p className="text-[10px] text-slate-400">Capture a new prospect</p>
                                                </div>
                                            </Link>
                                            <Link href="/dashboard/inventory" onClick={() => setShowQuickAction(false)} className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-colors group">
                                                <div className="bg-amber-50 text-amber-600 p-1.5 rounded-md group-hover:bg-amber-100 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold">New Project</p>
                                                    <p className="text-[10px] text-slate-400">Setup inventory tower</p>
                                                </div>
                                            </Link>
                                            <Link href="/dashboard/bookings" onClick={() => setShowQuickAction(false)} className="flex items-center space-x-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-colors group">
                                                <div className="bg-rose-50 text-rose-600 p-1.5 rounded-md group-hover:bg-rose-100 transition-colors">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold">New Booking</p>
                                                    <p className="text-[10px] text-slate-400">Initialize contract</p>
                                                </div>
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setShowNotifs(!showNotifs)}
                                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all relative group"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                {notifications.length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full"></span>}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifs && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4">
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                        <h3 className="text-xs font-bold text-slate-800 tracking-tight uppercase">Notifications</h3>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{notifications.length} New</span>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500 text-xs py-10">No new notifications</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div key={n.id} className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex gap-3">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"></div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-800">{n.message || n.title}</p>
                                                        <p className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-5 w-px bg-slate-200"></div>

                        <button
                            onClick={async () => {
                                setLoading(true);
                                await new Promise(r => setTimeout(r, 800)); // Simulated loading
                                localStorage.clear();
                                window.location.href = '/login';
                            }}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-widest flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                                    EXITING...
                                </>
                            ) : "EXIT"}
                        </button>
                    </div>
                </header>

                <section className="flex-1 overflow-y-auto p-8 relative custom-scrollbar bg-slate-100">
                    <div className="max-w-[1600px] mx-auto pb-20">
                        {children}
                    </div>
                </section>
            </main>
        </div>
    );
}
