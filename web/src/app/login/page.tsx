"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Step 1: Get Token
            const formData = new URLSearchParams();
            formData.append("username", email);
            formData.append("password", password);

            const res = await fetch(`${api.baseUrl}/auth/login/access-token`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: formData,
            });

            if (!res.ok) throw new Error("Invalid credentials");

            const data = await res.json();
            localStorage.setItem("token", data.access_token);

            // Step 2: Get User Info
            const userRes = await api.get("/auth/me");
            const userData = await userRes.json();
            localStorage.setItem("user", JSON.stringify(userData));

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/artifacts/login_bg_realestate_1773054703004.png"
                    className="w-full h-full object-cover scale-110 blur-[2px]"
                    alt="Background"
                />
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[20px] dark:bg-zinc-950/70" />
            </div>

            <div className="max-w-md w-full p-12 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl border border-white/50 dark:border-zinc-800 z-10 animate-fade-in shadow-2xl relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200">K</div>

                <div className="text-center mb-10 pt-4">
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-[0.2em]">KRADS ENTERPRISE PORTAL</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Identity Access</label>
                        <input
                            type="email"
                            required
                            className="w-full px-5 py-4 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all placeholder:text-zinc-300"
                            placeholder="agent@krads.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Security Key</label>
                        <input
                            type="password"
                            required
                            className="w-full px-5 py-4 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all placeholder:text-zinc-300"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center space-x-2 text-rose-600 text-xs font-bold animate-shake">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>VERIFYING...</span>
                            </div>
                        ) : (
                            "AUTHORIZE ACCESS"
                        )}
                    </button>
                </form>

                <div className="mt-12 flex items-center justify-center space-x-4 opacity-50">
                    <div className="h-px bg-zinc-200 w-12" />
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">End-to-End Encrypted</p>
                    <div className="h-px bg-zinc-200 w-12" />
                </div>
            </div>
        </div>
    );
}
