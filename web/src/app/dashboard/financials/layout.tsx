"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
    { name: "Dashboard", href: "/dashboard/financials" },
    { name: "Due Payments", href: "/dashboard/financials/due" },
    { name: "Overdue Payments", href: "/dashboard/financials/overdue" },
    { name: "Received Payments", href: "/dashboard/financials/received" },
    { name: "All Payments", href: "/dashboard/financials/all" },
];

export default function FinancialsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="space-y-6">
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
