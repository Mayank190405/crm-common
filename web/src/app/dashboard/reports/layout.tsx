"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
    { name: "Executive Summary", href: "/dashboard/reports" },
    { name: "Project Performance", href: "/dashboard/reports/project" },
    { name: "Employee Performance", href: "/dashboard/reports/employee" }
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Intelligence & Analytics</h1>
                    <p className="text-slate-500 text-sm">Real-time enterprise reporting matrix</p>
                </div>
            </div>

            <div className="flex space-x-2 border-b border-slate-200 pb-4 overflow-x-auto custom-scrollbar">
                {tabs.map(tab => {
                    const isActive = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all uppercase tracking-widest flex-shrink-0 ${isActive
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                                    : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200 hover:text-indigo-600"
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
