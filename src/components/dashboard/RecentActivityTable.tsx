import React from "react";
import { HiOutlineViewGrid, HiOutlineLocationMarker, HiOutlineArrowRight } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

interface RecentActivityTableProps {
    reports: any[];
}

const RecentActivityTable: React.FC<RecentActivityTableProps> = ({ reports }) => {
    const navigate = useNavigate();

    return (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 w-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-[#00172D]">Recent Activity</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                        Latest incident reports requiring attention
                    </p>
                </div>
                <button
                    onClick={() => navigate("/reports")}
                    className="px-4 py-2 bg-gray-50 text-gray-600 hover:bg-black hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                    View All
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 border-b border-gray-100 pb-3">
                            <th className="pb-3 pl-2">Issue Type</th>
                            <th className="pb-3">Site Location</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right pr-2">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {reports.map((r) => (
                            <tr key={r.id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="py-3 pl-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                                            <HiOutlineViewGrid size={16} />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-gray-800 block">
                                                {r.category}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-semibold">
                                                {new Date(r.createdAtMs).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3">
                                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                        <HiOutlineLocationMarker className="text-blue-500 shrink-0" />
                                        <span className="truncate max-w-[200px]">
                                            {r.locationName}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3">
                                    <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${r.status === "Resolved"
                                            ? "bg-green-50 text-green-600"
                                            : r.status === "In-progress"
                                                ? "bg-blue-50 text-blue-600"
                                                : r.status === "Pending"
                                                    ? "bg-amber-50 text-amber-600"
                                                    : "bg-gray-100 text-gray-500"
                                            }`}
                                    >
                                        {r.status}
                                    </span>
                                </td>
                                <td className="py-3 text-right pr-2">
                                    <button
                                        onClick={() => navigate(`/reports/${r.id}`)}
                                        className="p-1.5 text-gray-300 hover:text-black transition-colors transform hover:translate-x-1"
                                    >
                                        <HiOutlineArrowRight size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {reports.length === 0 && (
                    <div className="py-8 text-center text-gray-400 text-xs font-medium">
                        No recent activity found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentActivityTable;
