// ------------------------------------------------------
// src/pages/Teams.tsx — Updated Categories & Dropdown Style
// ------------------------------------------------------
import React, { useEffect, useState } from "react";
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "../firebase";
import { 
  HiPlus, 
  HiOutlineUsers, 
  HiOutlineTrash, 
  HiOutlineKey,
  HiOutlineIdentification,
  HiOutlineBriefcase,
  HiXMark,
  HiChevronDown // Added for the custom dropdown arrow
} from "react-icons/hi2";

// 1. Team Interface
interface Team {
  id: string;
  teamId: string;
  name: string;
  // Updated Category Types
  category: "Pothole" | "Drainage" | "Signage" | "Streetlight";
  status: "Available" | "Busy";
  passcode: string;
  memberCount: number;
}

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [newTeamName, setNewTeamName] = useState("");
  // Set default to first valid option
  const [newTeamCategory, setNewTeamCategory] = useState("Pothole");

  // Fetch Teams
  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "teams"), orderBy("teamId", "asc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(list);
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Generate Credentials
  const generateCredentials = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const randomPass = Math.floor(1000 + Math.random() * 9000);
    return {
      teamId: `T-${randomId}`,
      passcode: `${randomPass}`
    };
  };

  // Add Team
  const handleAddTeam = async () => {
    if (!newTeamName.trim()) return;

    const { teamId, passcode } = generateCredentials();

    const newTeam = {
      teamId,
      name: newTeamName,
      category: newTeamCategory,
      status: "Available",
      passcode,
      memberCount: 0,
      createdAt: Date.now()
    };

    await addDoc(collection(db, "teams"), newTeam);
    setIsModalOpen(false);
    setNewTeamName("");
    setNewTeamCategory("Pothole"); // Reset to default
    fetchTeams();
  };

  // Delete Team
  const handleDeleteTeam = async (id: string) => {
    if (window.confirm("Are you sure you want to disband this team?")) {
      await deleteDoc(doc(db, "teams", id));
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Teams</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage field units, generate access credentials, and track assignments.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm font-semibold shadow-md 
                       hover:opacity-90 transition active:scale-[0.97]"
          >
            <HiPlus className="w-5 h-5" />
            Create New Team
          </button>
        </div>

        {/* TEAM GRID */}
        {isLoading ? (
           <div className="flex justify-center py-20">
             <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-8 bg-gray-200 rounded-full mb-2"></div>
                <p className="text-gray-400 text-sm font-medium">Loading teams...</p>
             </div>
           </div>
        ) : teams.length === 0 ? (
           <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-gray-300">
             <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <HiOutlineUsers className="w-6 h-6 text-gray-400" />
             </div>
             <h3 className="text-sm font-semibold text-gray-900">No teams found</h3>
             <p className="text-xs text-gray-500 mt-1">Get started by creating a new work team.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div key={team.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <HiOutlineBriefcase className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => handleDeleteTeam(team.id)}
                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition active:scale-[0.90]"
                    title="Delete Team"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                </div>

                {/* Info */}
                <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                  {team.category}
                </span>

                {/* Credentials Box */}
                <div className="mt-6 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="flex justify-between items-center p-3 border-b border-gray-200/60">
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                      <HiOutlineIdentification className="w-4 h-4"/> Team ID
                    </span>
                    <span className="font-mono text-sm font-bold text-gray-900">{team.teamId}</span>
                  </div>
                  <div className="flex justify-between items-center p-3">
                    <span className="text-xs font-medium text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                      <HiOutlineKey className="w-4 h-4"/> Passcode
                    </span>
                    <span className="font-mono text-sm font-bold text-gray-900 tracking-widest bg-white px-2 py-0.5 rounded border border-gray-200">
                      {team.passcode}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 justify-center">
                   <div className={`w-2 h-2 rounded-full ${team.status === "Available" ? "bg-green-500" : "bg-amber-500"}`}></div>
                   <span className="text-xs font-medium text-gray-500">{team.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl transform scale-100 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Create Work Team</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                    <HiXMark className="w-6 h-6" />
                </button>
            </div>
            
            <div className="space-y-5">
              {/* Team Name Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Team Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Alpha Road Unit"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all placeholder-gray-400"
                />
              </div>

              {/* Improved Custom Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Category</label>
                <div className="relative">
                    <select 
                        value={newTeamCategory}
                        onChange={(e) => setNewTeamCategory(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 
                                   focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none 
                                   appearance-none cursor-pointer transition-all font-medium text-gray-700"
                    >
                        <option value="Pothole">Pothole Maintenance</option>
                        <option value="Drainage">Drainage / Sewer</option>
                        <option value="Signage">Signage Repair</option>
                        <option value="Streetlight">Street Lights</option>
                    </select>
                    {/* Custom Arrow Icon */}
                    <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                        <HiChevronDown className="w-4 h-4" />
                    </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl 
                           hover:bg-slate-50 transition active:scale-[0.97]"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTeam}
                disabled={!newTeamName.trim()}
                className="flex-1 py-3 text-sm font-semibold text-white bg-black rounded-xl 
                           hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.97]"
              >
                Create Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;