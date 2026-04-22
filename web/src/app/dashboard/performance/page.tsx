"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface EmployeePerformance {
    employee_id: number;
    employee_name: string;
    role: string;
    leads_managed: number;
    new_leads_period: number;
    visits_scheduled: number;
    bookings_closed: number;
    revenue: number;
    conversion_rate: number;
}

export default function PerformancePage() {
    const [performanceData, setPerformanceData] = useState<EmployeePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(90);

    useEffect(() => {
        async function fetchPerformance() {
            setLoading(true);
            try {
                const res = await api.get(`/reports/employee-performance?days=${days}`);
                if (res.ok) {
                    setPerformanceData(await res.json());
                }
            } catch (err) {
                console.error("Failed to fetch performance data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchPerformance();
    }, [days]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Employee Performance</h1>
                    <p className="text-slate-500 font-medium">Track sales efficiency and conversion metrics across your team.</p>
                </div>
                <div className="flex items-center space-x-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {[30, 90, 180, 365].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${days === d ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            {d} DAYS
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl border border-slate-100 animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Top Performers Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {performanceData.slice(0, 3).map((emp, idx) => (
                            <div key={emp.employee_id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all border-b-4 border-b-indigo-500">
                                <div className="absolute top-0 right-0 p-6 opacity-5 font-black text-6xl">#{idx + 1}</div>
                                <div className="relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold mb-4">
                                        {emp.employee_name.charAt(0)}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800">{emp.employee_name}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{emp.role}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Revenue</p>
                                            <p className="text-lg font-black text-indigo-600">₹{emp.revenue.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Conversion</p>
                                            <p className="text-lg font-black text-emerald-500">{emp.conversion_rate}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Leaderboard */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Full Leaderboard</h2>
                            <span className="text-[10px] font-bold text-slate-400">RANKED BY TOTAL REVENUE</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                        <th className="px-8 py-4">Employee</th>
                                        <th className="px-4 py-4">Leads Managed</th>
                                        <th className="px-4 py-4">New (Period)</th>
                                        <th className="px-4 py-4">Meetings/Visits</th>
                                        <th className="px-4 py-4">Bookings</th>
                                        <th className="px-4 py-4">Conversion</th>
                                        <th className="px-8 py-4 text-right">Revenue Generated</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {performanceData.map((emp) => (
                                        <tr key={emp.employee_id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        {emp.employee_name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{emp.employee_name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-5">
                                                <span className="text-sm font-black text-slate-700">{emp.leads_managed}</span>
                                            </td>
                                            <td className="px-4 py-5">
                                                <span className="text-sm font-black text-slate-700">{emp.new_leads_period}</span>
                                            </td>
                                            <td className="px-4 py-5">
                                                <span className="text-sm font-black text-indigo-600">{emp.visits_scheduled}</span>
                                            </td>
                                            <td className="px-4 py-5">
                                                <span className="text-sm font-black text-emerald-600">{emp.bookings_closed}</span>
                                            </td>
                                            <td className="px-4 py-5">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-12 overflow-hidden">
                                                        <div 
                                                            className="h-full bg-emerald-500 rounded-full" 
                                                            style={{ width: `${Math.min(emp.conversion_rate, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-600">{emp.conversion_rate}%</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-slate-800">
                                                ₹{emp.revenue.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
