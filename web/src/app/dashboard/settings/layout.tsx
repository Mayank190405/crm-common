"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
    { name: "General Preference", href: "/dashboard/settings" },
    { name: "User Management", href: "/dashboard/settings/users" },
    { name: "Network Inventory", href: "/dashboard/settings/inventory" }
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration</h1>
                    <p className="text-slate-500 text-sm">Centralized control panel for Krads CRM</p>
                </div>
            </div>

            <div className="flex space-x-2 border-b border-slate-200 pb-4 overflow-x-auto custom-scrollbar">
                {tabs.map(tab => {
                    const isActive = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`px-5 py-2.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all uppercase tracking-widest flex-shrink-0 ${isActive
                                    ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                                    : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 hover:text-slate-900"
                                }`}
                        >
                            {tab.name}
                        </Link>
                    );
                })}
            </div>
            {children}
        </div>
    );
}
