"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    // Create Project State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Bulk Upload State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadTowerName, setUploadTowerName] = useState("Tower 1");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProjectId, setUploadProjectId] = useState<string>("");

    // Manual Booking State
    const [showManualBookingModal, setShowManualBookingModal] = useState(false);
    const [bookingUnit, setBookingUnit] = useState<any>(null);
    const [isManualBookingLoading, setIsManualBookingLoading] = useState(false);
    const [manualBookingData, setManualBookingData] = useState({
        full_name: "",
        email: "",
        phone: "",
        total_cost: ""
    });

    const router = useRouter();

    const loadProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get("/projects");
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
                if (data.length > 0 && !selectedProject) setSelectedProject(data[0]);
            }
        } catch (err) {
            console.error("Failed to load inventory", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser(payload);
            } catch (e) { }
        }
    }, []);

    const handleCreateProject = async () => {
        if (!newProjectName || !newLocation) return;
        setIsSaving(true);
        try {
            const res = await api.post("/projects", {
                name: newProjectName,
                location: newLocation
            });
            if (res.ok) {
                setShowCreateModal(false);
                setNewProjectName("");
                setNewLocation("");
                loadProjects();
            } else {
                alert("Failed to create project");
            }
        } catch (err) {
            alert("Error creating project");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBulkUpload = async () => {
        if (!uploadFile || !uploadProjectId) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", uploadFile);

        try {
            const res = await api.upload(`/projects/${uploadProjectId}/bulk-upload-inventory?tower_name=${encodeURIComponent(uploadTowerName)}`, formData);
            if (res.ok) {
                const data = await res.json();
                alert(data.msg);
                setShowUploadModal(false);
                setUploadFile(null);
                loadProjects();
            } else {
                alert("Failed to upload inventory");
            }
        } catch (err) {
            alert("Error during upload");
        } finally {
            setIsUploading(false);
        }
    };

    const handleManualBooking = async () => {
        if (!bookingUnit || !manualBookingData.full_name || !manualBookingData.phone || !manualBookingData.total_cost) {
            alert("All primary verification fields are required.");
            return;
        }

        setIsManualBookingLoading(true);
        try {
            const res = await api.post("/bookings/manual", {
                unit_id: bookingUnit.unitId,
                full_name: manualBookingData.full_name,
                email: manualBookingData.email || `${manualBookingData.phone}@placeholder.com`,
                phone: manualBookingData.phone,
                total_cost: parseFloat(manualBookingData.total_cost)
            });

            if (res.ok) {
                alert("BOOKING CONFIRMED: Property successfully booked for customer.");
                setShowManualBookingModal(false);
                loadProjects();
            } else {
                const err = await res.json();
                alert(`Booking Failed: ${err.detail || "Verification failed"}`);
            }
        } catch (err) {
            alert("Booking Error: Connection to server disrupted.");
        } finally {
            setIsManualBookingLoading(false);
        }
    };

    // Flatten data for the table view
    const tableData = useMemo(() => {
        if (!selectedProject?.towers) return [];

        const rows: any[] = [];
        // Sort towers and floors for consistent display
        const sortedTowers = [...selectedProject.towers].sort((a, b) => a.id - b.id);

        sortedTowers.forEach(tower => {
            const sortedFloors = [...tower.floors].sort((a, b) => a.floor_number - b.floor_number);
            sortedFloors.forEach(floor => {
                const sortedUnits = [...floor.units].sort((a, b) => a.unit_number.localeCompare(b.unit_number));
                sortedUnits.forEach((unit, index) => {
                    rows.push({
                        floorNumber: `${floor.floor_number}${getOrdinal(floor.floor_number)} FLOOR`,
                        unitNumber: unit.unit_number,
                        unitType: unit.unit_type || "N/A",
                        customerName: unit.customer_name || "-",
                        mobileNo: unit.customer_phone || "-",
                        saleableArea: unit.saleable_area || "0",
                        status: unit.status,
                        isFirstInFloor: index === 0,
                        unitsInFloor: sortedUnits.length,
                        unitId: unit.id,
                        blockedBy: unit.blocked_by || "System"
                    });
                });
            });
        });
        return rows;
    }, [selectedProject]);

    function getOrdinal(n: number) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    }

    return (
        <div className="space-y-6 animate-fade-in relative max-w-[1600px]">
            <div className="flex items-center justify-between bg-white px-6 py-4 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">Inventory</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time property availability and sales tracking</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => {
                            setUploadProjectId(selectedProject?.id?.toString() || "");
                            setShowUploadModal(true);
                        }}
                        className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded font-bold text-[10px] tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                        BULK UPLOAD
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 text-white px-5 py-2 rounded font-bold text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                        + NEW PROJECT
                    </button>
                </div>
            </div>

            {/* Project Selector - Zoho Style Toolbar */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                {projects.map((proj) => (
                    <button
                        key={proj.id}
                        onClick={() => setSelectedProject(proj)}
                        className={`px-4 py-2 rounded font-bold text-[11px] uppercase tracking-wide transition-all ${selectedProject?.id === proj.id
                            ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                    >
                        {proj.name}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100">Floor Level</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100">Unit ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100">Configuration</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100">Current Occupant</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100">Primary Contact</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Sale Record</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-20 text-slate-400 animate-pulse">Loading inventory data...</td></tr>
                            ) : tableData.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-20 text-slate-400">No units defined for this project.</td></tr>
                            ) : (
                                tableData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                        {row.isFirstInFloor && (
                                            <td
                                                rowSpan={row.unitsInFloor}
                                                className="px-6 py-4 text-[11px] font-bold text-slate-900 border-r border-slate-100 bg-slate-50/20 align-top uppercase tracking-tight"
                                            >
                                                {row.floorNumber}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 border-r border-slate-100">
                                            <button
                                                onClick={() => router.push(`/dashboard/inventory/units/${row.unitId}`)}
                                                className="text-[12px] font-bold text-blue-600 hover:underline hover:text-blue-700 uppercase tracking-tight"
                                            >
                                                {row.unitNumber}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 border-r border-slate-100 text-[11px] text-slate-500 font-medium">
                                            {row.unitType}
                                        </td>
                                        <td className="px-6 py-4 border-r border-slate-100 text-[11px] text-slate-800 font-bold uppercase">
                                            {row.customerName}
                                        </td>
                                        <td className="px-6 py-4 border-r border-slate-100 text-slate-500 font-medium text-[11px] tabular-nums">
                                            {row.mobileNo}
                                        </td>
                                        <td className="px-6 py-4 border-r border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-900 tabular-nums">{row.saleableArea} SQFT</span>
                                                {row.status === 'AVAILABLE' && user?.role === 'admin' && (
                                                    <button
                                                        onClick={() => {
                                                            setBookingUnit(row);
                                                            setShowManualBookingModal(true);
                                                        }}
                                                        className="text-[9px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest underline decoration-2 underline-offset-4"
                                                    >
                                                        BOOK UNIT
                                                    </button>
                                                )}
                                                {row.status === 'BLOCKED' && (
                                                    <div className="flex items-center bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 text-[9px] font-bold uppercase tracking-widest">
                                                        <span className="w-1 h-1 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                                                        RESERVED
                                                    </div>
                                                )}
                                                {row.status === 'SOLD' && (
                                                    <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">
                                                        SOLD
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual Booking Modal */}
            {showManualBookingModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-1">Priority Booking</h2>
                                <p className="text-sm text-slate-500">Adding an administrative booking for Unit {bookingUnit?.unitNumber}.</p>
                            </div>
                            <button onClick={() => setShowManualBookingModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Full Name</label>
                                <input
                                    type="text"
                                    value={manualBookingData.full_name}
                                    onChange={(e) => setManualBookingData({ ...manualBookingData, full_name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter customer name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Primary Phone</label>
                                    <input
                                        type="tel"
                                        value={manualBookingData.phone}
                                        onChange={(e) => setManualBookingData({ ...manualBookingData, phone: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Mobile Number"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Agreed Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={manualBookingData.total_cost}
                                        onChange={(e) => setManualBookingData({ ...manualBookingData, total_cost: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                        placeholder="Final Sale Value"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email Confirmation</label>
                                <input
                                    type="email"
                                    value={manualBookingData.email}
                                    onChange={(e) => setManualBookingData({ ...manualBookingData, email: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="customer@example.com"
                                />
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={handleManualBooking}
                                    disabled={isManualBookingLoading}
                                    className={`w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-xl flex items-center justify-center space-x-2 transition-all ${isManualBookingLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-800 hover:-translate-y-0.5"}`}
                                >
                                    {isManualBookingLoading ? "Processing Booking..." : "🚀 Confirm Booking"}
                                </button>
                                <button
                                    onClick={() => setShowManualBookingModal(false)}
                                    className="w-full mt-3 py-3 font-bold text-slate-400 hover:text-slate-600 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-1">Define New Project</h2>
                                <p className="text-sm text-slate-500">Add a new real estate venture to the system.</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Project Name</label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Skyline Towers"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Location</label>
                                <input
                                    type="text"
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Sector 45, Gurgaon"
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateProject}
                                    disabled={isSaving || !newProjectName || !newLocation}
                                    className={`flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {isSaving ? "Initializing..." : "Create Project"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 mb-1">Bulk Inventory Upload</h2>
                                <p className="text-sm text-slate-500">Upload multiple units via CSV/Excel.</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 mb-2">✕</button>
                                <a
                                    href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/projects/sample-csv`}
                                    className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                                >
                                    Download Template
                                </a>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Target Project</label>
                                <select
                                    value={uploadProjectId}
                                    onChange={(e) => setUploadProjectId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select Project</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tower/Phase Name</label>
                                <input
                                    type="text"
                                    value={uploadTowerName}
                                    onChange={(e) => setUploadTowerName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Tower A"
                                />
                            </div>

                            <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                                <input
                                    type="file"
                                    id="inv-file"
                                    className="hidden"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                                />
                                <label htmlFor="inv-file" className="cursor-pointer group">
                                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</div>
                                    <p className="text-sm font-bold text-slate-700">
                                        {uploadFile ? uploadFile.name : "Click to select property spreadsheet"}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-bold">CSV or Excel only</p>
                                </label>
                            </div>

                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Required Columns</p>
                                <div className="flex flex-wrap gap-2">
                                    {["Floor", "Unit", "Unit Type", "Saleable Area"].map(col => (
                                        <span key={col} className="bg-white px-2 py-1 rounded-md text-[10px] font-bold text-indigo-600 border border-indigo-100">{col}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkUpload}
                                    disabled={isUploading || !uploadFile || !uploadProjectId}
                                    className={`flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all ${isUploading || !uploadFile || !uploadProjectId ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {isUploading ? "Importing..." : "Start Upload"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
