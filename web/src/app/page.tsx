"use client";

import { useTheme } from "@/components/theme-provider";
import Link from "next/link";

export default function Home() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-[family-name:var(--font-geist-sans)] transition-colors duration-300">
      <header className="p-6 flex justify-between items-center border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-indigo-500/20">K</div>
          <h1 className="text-xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">Krads CRM</h1>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Leads</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Inventory</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Bookings</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Reports</a>
          </nav>

          <div className="flex items-center gap-3 border-l border-slate-200 dark:border-white/10 pl-6">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
            <Link href="/login" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20">
              Agent Login
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <section className="flex flex-col items-center text-center gap-8 py-24">
          <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/20">
            Enterprise CRM Platform
          </span>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-slate-900 dark:text-white max-w-4xl">
            The Hub for <br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Real Estate Ops</span>
          </h2>
          <p className="max-w-2xl text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed">
            Manage leads, track inventory, and handle bookings in a unified, professional environment designed for growth.
          </p>
          <div className="flex gap-4 mt-6">
            <Link href="/dashboard" className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.25rem] font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-2xl">
              Go to Dashboard
            </Link>
            <button className="px-10 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-[1.25rem] font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              Documentation
            </button>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mt-12">
          {[
            { title: "Lead Management", value: "Aunified lead lifecycle", desc: "Track every interaction from inquiry to closing." },
            { title: "Inventory List", value: "Real-time availability", desc: "Manage property units and statuses instantly." },
            { title: "Booking Flow", value: "Secure reservations", desc: "Automated booking workflows and approvals." }
          ].map((stat, i) => (
            <div key={i} className="p-10 rounded-[2.5rem] border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 shadow-sm hover:shadow-2xl transition-all group">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.title}</h3>
              <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{stat.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
