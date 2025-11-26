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
import { HiClipboardList, HiClock, HiCheckCircle } from "react-icons/hi";

const statusColor: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  "In-progress": "bg-blue-100 text-blue-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  // --- ADDED DECLINED STATUS COLOR ---
  Declined: "bg-red-100 text-red-700",
  // -----------------------------------
};

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Live updates (no refresh needed)
  useEffect(() => {
    const q = query(
      collection(db, "all_reports"),
      orderBy("createdAtMs", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReports(list);
    });

    return () => unsub();
  }, []);

  // Summary counts
  const totalPending = reports.filter((r) => r.status === "Pending").length;
  const totalInProgress = reports.filter((r) => r.status === "In-progress").length;
  const totalResolved = reports.filter((r) => r.status === "Resolved").length;

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Search filter
  const filteredReports = reports.filter((r) => {
    const s = search.toLowerCase();
    return (
      (r.adminReportId || "").toLowerCase().includes(s) ||
      (r.category || "").toLowerCase().includes(s) ||
      (r.description || "").toLowerCase().includes(s)
    );
  });

  // Shorten long descriptions
  const shorten = (text: string = "") =>
    text.length > 40 ? text.slice(0, 40) + "..." : text;

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <p className="text-xs text-gray-400">{today}</p>
        <h1 className="text-3xl font-semibold text-gray-900 mt-1">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review, triage, and track Fixit Lanka issue reports in one place.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Pending */}
        <div className="flex items-center gap-4 bg-white p-5 shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <HiClock size={22} />
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 font-medium">Pending</p>
            <p className="text-3xl font-semibold text-gray-800 mt-1">
              {totalPending}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Waiting for admin to assign the task</p>
          </div>
        </div>

        {/* In-progress */}
        <div className="flex items-center gap-4 bg-white p-5 shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <HiClipboardList size={22} />
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 font-medium">In-progress</p>
            <p className="text-3xl font-semibold text-gray-800 mt-1">
              {totalInProgress}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Currently being processed</p>
          </div>
        </div>

        {/* Resolved */}
        <div className="flex items-center gap-4 bg-white p-5 shadow-sm border border-gray-100 rounded-2xl hover:shadow-md transition">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
            <HiCheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 font-medium">Resolved</p>
            <p className="text-3xl font-semibold text-gray-800 mt-1">
              {totalResolved}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Marked as completed</p>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">

        {/* TABS + SEARCH */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-6 text-sm">
            <span className="font-medium text-black border-b-2 border-black pb-1">
              All reports
            </span>
            <span className="text-gray-500 hover:text-black cursor-pointer">Pending</span>
            <span className="text-gray-500 hover:text-black cursor-pointer">In-progress</span>
            <span className="text-gray-500 hover:text-black cursor-pointer">Resolved</span>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, category, or ID..."
              className="text-xs w-72 rounded-full bg-white border border-gray-200 pl-9 pr-4 py-2 focus:ring-1 focus:ring-black/70 transition"
            />
          </div>
        </div>

        {/* EMPTY STATE */}
        {filteredReports.length === 0 && (
          <div className="py-16 text-center text-gray-500 text-sm">
            No reports found.
          </div>
        )}

        {/* TABLE */}
        {filteredReports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-white border-b border-gray-100 text-xs text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-medium w-[100px] text-left">Report ID</th>
                  <th className="px-6 py-3 font-medium w-[150px] text-left">Category</th>
                  <th className="px-6 py-3 font-medium w-[350px] text-left">Description</th>
                  <th className="px-6 py-3 font-medium w-[120px] text-left">Report Status</th>
                  <th className="px-6 py-3 font-medium w-[180px] text-left">Created</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.map((r, idx) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/reports/${r.id}`)}
                    className={`cursor-pointer transition ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-gray-100`}
                  >
                    <td className="px-6 py-3 text-xs font-mono text-gray-600">
                      {r.adminReportId || "---"}
                    </td>

                    <td className="px-6 py-3 text-sm text-gray-700">
                      {r.category}
                    </td>

                    <td className="px-6 py-3 text-xs text-gray-500">
                      {shorten(r.description)}
                    </td>

                    <td className="px-6 py-3">
                      <span
                        className={`
                          inline-flex items-center justify-center
                          min-w-[90px] h-[28px]
                          px-3 rounded-full text-[11px] font-medium
                        ${statusColor[r.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="px-6 py-3 text-xs text-gray-500">
                      {new Date(r.createdAtMs).toLocaleString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;