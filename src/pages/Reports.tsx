import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebase";

import { FiSearch } from "react-icons/fi";
// Using standard 'hi' library to avoid import errors
import {
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlinePause
} from "react-icons/hi";

const statusColor: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  "In-progress": "bg-blue-100 text-blue-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Declined: "bg-red-100 text-red-700",
  "On-Hold": "bg-orange-100 text-orange-700",
};

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "all_reports"), orderBy("createdAtMs", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(list);
    });
    return () => unsub();
  }, []);

  // Summary counts
  const totalPending = reports.filter((r) => r.status === "Pending").length;
  const totalInProgress = reports.filter((r) => r.status === "In-progress").length;
  const totalOnHold = reports.filter((r) => r.status === "On-Hold").length;
  const totalResolved = reports.filter((r) => r.status === "Resolved").length;

  const filteredReports = reports.filter((r) => {
    const s = search.toLowerCase();
    const matchesSearch =
      (r.adminReportId || "").toLowerCase().includes(s) ||
      (r.category || "").toLowerCase().includes(s) ||
      (r.description || "").toLowerCase().includes(s);

    let matchesTab = true;
    if (activeTab !== "All") matchesTab = r.status === activeTab;

    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Incidents</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">Incident Reports</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Review and track all maintenance tasks in real-time.</p>
      </div>

      {/* SUMMARY CARDS (Classic Style with Better Spacing) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <MetricCard
          label="Pending" count={totalPending} icon={<HiOutlineClock size={22} />}
          color="amber" active={activeTab === "Pending"} onClick={() => setActiveTab("Pending")}
          subText="Waiting for assignment"
        />
        <MetricCard
          label="In-progress" count={totalInProgress} icon={<HiOutlineClipboardList size={22} />}
          color="blue" active={activeTab === "In-progress"} onClick={() => setActiveTab("In-progress")}
          subText="Active in field"
        />
        <MetricCard
          label="On-Hold" count={totalOnHold} icon={<HiOutlinePause size={22} />}
          color="orange" active={activeTab === "On-Hold"} onClick={() => setActiveTab("On-Hold")}
          subText="Work suspended"
        />
        <MetricCard
          label="Resolved" count={totalResolved} icon={<HiOutlineCheckCircle size={22} />}
          color="emerald" active={activeTab === "Resolved"} onClick={() => setActiveTab("Resolved")}
          subText="Tasks completed"
        />
      </div>

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">

        {/* TABS + SEARCH */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 border-b border-gray-100 gap-6">
          <div className="flex items-center gap-8">
            {["All", "Pending", "In-progress", "On-Hold", "Resolved"].map((tab) => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`cursor-pointer pb-2 text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === tab
                  ? "text-[#00172D] border-b-2 border-[#00172D]"
                  : "text-gray-400 hover:text-gray-600 border-b-2 border-transparent"
                  }`}
              >
                {tab === "All" ? "All" : tab}
              </span>
            ))}
          </div>

          <div className="relative group w-full md:w-auto">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="w-full md:w-64 bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 pl-9 pr-4 py-2.5 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-gray-100 focus:border-gray-300 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-8 py-4">Report ID</th>
                <th className="px-8 py-4">Category</th>
                <th className="px-8 py-4">Description</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-slate-50 p-4 rounded-full">
                        <HiOutlineClipboardList size={32} className="text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">No reports found</p>
                        <p className="text-xs">New citizen reports will appear here.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/reports/${r.id}`)}
                    className="group cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <span className="font-mono text-xs font-bold text-[#00172D] bg-gray-100/50 px-2 py-1 rounded text-gray-600">
                        {r.adminReportId || "---"}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-gray-700">{r.category}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs text-gray-500 font-medium max-w-[250px] truncate">
                        {r.description}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center justify-center min-w-[90px] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor[r.status] || "bg-gray-100 text-gray-500"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-medium text-gray-500">
                        {new Date(r.createdAtMs).toLocaleString("en-GB", { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </td>
                  </tr>
                )))}
            </tbody>
          </table>
          {/* Removed old empty state div */}
        </div>
      </div>
    </div >
  );
};

// --- HELPER COMPONENT: METRIC CARD ---
// --- HELPER COMPONENT: METRIC CARD ---
const MetricCard = ({ label, count, icon, color, active, onClick, subText }: any) => {
  const colors: any = {
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 shadow-sm border border-gray-100/50 rounded-2xl hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full cursor-pointer ${active ? "ring-2 ring-black border-transparent" : ""
        }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase text-gray-400 font-bold tracking-widest mb-1">
            {label}
          </p>
          <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{count}</p>
        </div>
        <div className={`p-3 rounded-xl ${colors[color]} shadow-sm`}>{icon}</div>
      </div>
      <div className="flex items-center gap-2">
        {/* Badge adapted for Reports context - showing active state or just a dot */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color === 'orange' ? 'text-orange-600 bg-orange-50' : 'text-emerald-600 bg-emerald-50'}`}>
          {active ? 'Active' : 'View'}
        </span>
        <p className="text-[11px] text-gray-400 font-medium truncate">{subText}</p>
      </div>
    </div>
  );
};

export default Reports;