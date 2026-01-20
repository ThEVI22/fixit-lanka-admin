import React from "react";
import { HiOutlineBriefcase, HiOutlineStatusOnline, HiOutlineUserGroup } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

interface Team {
    id: string;
    teamName: string;
    category: string;
    supervisorEmail: string;
    status?: string;
}

interface FieldOperationsWidgetProps {
    teams: Team[];
}

const FieldOperationsWidget: React.FC<FieldOperationsWidgetProps> = ({ teams }) => {
    // Mocking status or simple logic: If supervisor is assigned, they are "Ready" or "Deployed"
    // In a real app, we'd check the supervisor's status (In-Work vs Available)
    // For now, let's assume all teams with a supervisor are "Active Units"
    const activeTeams = teams.filter(t => t.supervisorEmail).slice(0, 5);
    const navigate = useNavigate();

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case "Pothole Maintenance": return "bg-blue-50 text-blue-600";
            case "Streetlight": return "bg-amber-50 text-amber-600";
            case "Drainage": return "bg-emerald-50 text-emerald-600";
            default: return "bg-gray-50 text-gray-600";
        }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow duration-300 h-fit w-full">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-[#00172D]">Field Operations</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                        Live maintenance units status
                    </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center animate-pulse">
                    <HiOutlineStatusOnline className="text-green-500" />
                </div>
            </div>

            <div className="space-y-4">
                {activeTeams.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-xs text-gray-400">No active field units.</p>
                    </div>
                ) : activeTeams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-50 hover:border-gray-100 hover:bg-gray-50/50 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryColor(team.category)}`}>
                                <HiOutlineBriefcase size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">{team.teamName}</p>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <HiOutlineUserGroup size={12} />
                                    <span className="truncate max-w-[120px]">{team.supervisorEmail}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Active
                            </span>
                            <span className="text-[9px] text-gray-300 mt-1 font-medium">{team.category}</span>
                        </div>
                    </div>
                ))}

                <button
                    onClick={() => navigate("/teams")}
                    className="w-full py-3 mt-2 text-xs font-bold text-gray-500 hover:text-black hover:bg-gray-50 rounded-xl transition-all border border-dashed border-gray-200"
                >
                    View All Units
                </button>
            </div>
        </div>
    );
};

export default FieldOperationsWidget;
