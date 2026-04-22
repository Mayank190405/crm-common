"use client";

import { useState } from "react";

export default function GeneralSettings() {
    const [webNotifs, setWebNotifs] = useState(true);
    const [mobileNotifs, setMobileNotifs] = useState(true);
    const [theme, setTheme] = useState("LIGHT");

    const savePreferences = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app this would call an API to persist preferences.
        alert("System Configuration Saved");
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                General Global Settings
            </h2>

            <form onSubmit={savePreferences} className="max-w-2xl space-y-10">
                {/* Branding Block */}
                <div className="space-y-4 pb-8 border-b border-slate-100">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Brand Protocol</h3>
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-800">Master Brand Identity</p>
                            <p className="text-sm text-slate-500">Currently broadcasting globally internally as "Krads CRM"</p>
                        </div>
                        <div className="px-4 py-2 bg-indigo-100 text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg">
                            ACTIVE
                        </div>
                    </div>
                </div>

                {/* Notifications Block */}
                <div className="space-y-6 pb-8 border-b border-slate-100">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Telemetry & Notifications</h3>

                    <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-transparent shadow-sm hover:border-slate-100" onClick={() => setWebNotifs(!webNotifs)}>
                        <div>
                            <p className="font-bold text-slate-800">Web Application Alerts</p>
                            <p className="text-xs text-slate-500 max-w-sm mt-1">Receive priority event pings directly inside your desktop browser runtime when online.</p>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-all relative ${webNotifs ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${webNotifs ? 'left-7' : 'left-1'}`}></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-transparent shadow-sm hover:border-slate-100" onClick={() => setMobileNotifs(!mobileNotifs)}>
                        <div>
                            <p className="font-bold text-slate-800">iOS / Android Push Service</p>
                            <p className="text-xs text-slate-500 max-w-sm mt-1">Force push-token notifications to connected field devices for critical payment and lead routing.</p>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-all relative ${mobileNotifs ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${mobileNotifs ? 'left-7' : 'left-1'}`}></div>
                        </div>
                    </div>
                </div>

                {/* Color Theme Block */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">UI Theme Matrix</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setTheme('LIGHT')}
                            className={`p-6 border-2 rounded-2xl text-left transition-all ${theme === 'LIGHT' ? 'border-slate-900 bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                        >
                            <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-xl mb-4"></div>
                            <p className="font-bold text-slate-800 text-sm">Light Protocol</p>
                            <p className="text-[10px] mt-1 text-slate-500">Maximum contrast operational view</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setTheme('DARK')}
                            className={`p-6 border-2 rounded-2xl text-left transition-all ${theme === 'DARK' ? 'border-slate-900 bg-slate-900' : 'border-slate-100 bg-slate-900 opacity-70 hover:opacity-100'}`}
                        >
                            <div className="w-12 h-12 bg-slate-800 border-slate-700 shadow-sm rounded-xl mb-4"></div>
                            <p className="font-bold text-white text-sm">Dark Matrix</p>
                            <p className="text-[10px] mt-1 text-slate-400">Low-glare terminal configuration</p>
                        </button>
                    </div>
                </div>

                <div className="pt-6">
                    <button type="submit" className="bg-slate-900 text-white shadow-xl shadow-slate-200 px-8 py-3 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-800 transition-all">
                        Commit Configuration
                    </button>
                </div>
            </form>
        </div>
    );
}
