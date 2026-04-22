"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState("");
    
    // Task Audit State
    const [tasks, setTasks] = useState<any[]>([]);
    const [tasksLoading, setTasksLoading] = useState(true);
    const [taskFilter, setTaskFilter] = useState<'upcoming' | 'past'>('upcoming');

    useEffect(() => {
        async function loadStats() {
            try {
                const res = await api.get("/reports/summary");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
        setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, []);

    useEffect(() => {
        async function loadTasks() {
            setTasksLoading(true);
            try {
                const res = await api.get(`/activities?range=${taskFilter}`);
                if (res.ok) {
                    setTasks(await res.json());
                }
            } catch (err) {
                console.error("Failed to load tasks", err);
            } finally {
                setTasksLoading(false);
            }
        }
        loadTasks();
    }, [taskFilter]);

    const handleMarkComplete = async (taskId: number) => {
        try {
            const res = await api.patch(`/activities/${taskId}/complete`, {});
            if (res.ok) {
                setTasks(tasks.filter(t => t.id !== taskId));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const cards = [
        {
            label: "Total Pipeline", value: stats?.leads?.total || 0, color: "bg-indigo-50 text-indigo-700", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )
        },
        {
            label: "Confirmed Bookings", value: stats?.bookings?.total_confirmed || 0, color: "bg-emerald-50 text-emerald-700", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            )
        },
        {
            label: "Available Units", value: stats?.inventory?.available || 0, color: "bg-blue-50 text-blue-700", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            )
        },
        {
            label: "Lease Waitlist", value: stats?.inventory?.blocked || 0, color: "bg-amber-50 text-amber-700", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )
        },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-10 h-10 border-2 border-zinc-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Compiling Analytics</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
                    <p className="text-xs font-medium text-slate-500">Overview of operational performance and unit allocation</p>
                </div>
                <div className="flex items-center space-x-2">
                    {currentTime && (
                        <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 uppercase">
                            Real-time Update • {currentTime}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {cards.map((card) => (
                    <div key={card.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${card.color.split(' ')[0]} transition-all group-hover:scale-110`}>
                                <div className={card.color.split(' ')[1]}>{card.icon}</div>
                            </div>
                            <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-bold text-emerald-600">+4.2%</span>
                                <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            </div>
                        </div>
                        <h3 className="text-xs font-bold text-slate-500 mb-1 tracking-tight">{card.label}</h3>
                        <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-white">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Task Audit & Operational Focus</h3>
                        </div>
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button 
                                onClick={() => setTaskFilter('upcoming')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${taskFilter === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                TO DO (24H)
                            </button>
                            <button 
                                onClick={() => setTaskFilter('past')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${taskFilter === 'past' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                DONE (90D)
                            </button>
                        </div>
                    </div>
                    <div className="p-6 flex-1 bg-white">
                        {tasksLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center mb-4 shadow-sm text-slate-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No activities detected in this scope</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map((task: any) => (
                                    <div key={task.id} className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-white hover:shadow-md transition-all">
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-1.5 h-10 rounded-full ${taskFilter === 'upcoming' ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{task.note}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        {taskFilter === 'upcoming' ? new Date(task.follow_up_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true }) : new Date(task.completed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}
                                                    </span>
                                                    {task.lead_name && (
                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">LEAD: {task.lead_name}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {taskFilter === 'upcoming' && (
                                            <button 
                                                onClick={() => handleMarkComplete(task.id)}
                                                className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-95 transition-all"
                                            >
                                                MARK AS DONE
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-6 flex justify-center">
                             <button onClick={() => window.location.href = '/dashboard/leads'} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest transition-colors">Explorer All Activities</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
                    <div className="px-8 py-5 border-b border-slate-200 bg-white">
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">Inventory Distribution</h3>
                    </div>
                    <div className="p-8 space-y-8 flex-1 flex flex-col justify-center">
                        {[
                            { label: 'Available', value: stats?.inventory?.available || 0, color: 'bg-blue-600' },
                            { label: 'Confirmed', value: stats?.inventory?.sold || 0, color: 'bg-emerald-500' },
                            { label: 'Blocked', value: stats?.inventory?.blocked || 0, color: 'bg-amber-500' }
                        ].map((item) => (
                            <div key={item.label} className="group">
                                <div className="flex justify-between items-end mb-2.5">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                                        {item.value} <span className="text-[10px] text-slate-400 font-medium ml-0.5 uppercase">U</span>
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} transition-all duration-1000 ease-out rounded-full shadow-inner`}
                                        style={{ width: `${(item.value / (stats?.inventory?.available + (stats?.inventory?.sold || 0) + (stats?.inventory?.blocked || 0) || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}