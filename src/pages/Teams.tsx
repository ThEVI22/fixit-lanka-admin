// ------------------------------------------------------
// src/pages/Teams.tsx — Updated with Success Popup
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
import PopupMessage from "../components/PopupMessage"; // Ensure this path is correct
import { 
  HiPlus, 
  HiOutlineUsers, 
  HiOutlineTrash, 
  HiOutlineKey,
  HiOutlineIdentification,
  HiOutlineBriefcase,
  HiXMark,
  HiChevronDown,
  HiOutlineExclamationCircle 
} from "react-icons/hi2";

interface Team {
  id: string;
  teamId: string;
  name: string;
  category: "Pothole" | "Drainage" | "Signage" | "Streetlight";
  status: "Available" | "Busy";
  passcode: string;
  memberCount: number;
}

const Teams: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);

  // Popup Controller
  const [popup, setPopup] = useState<{
    type?: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  } | null>(null);

  const showPopup = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string
  ) => setPopup({ type, title, message });

  // Form State
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamCategory, setNewTeamCategory] = useState("Pothole");
  
  const isDuplicateName = teams.some(
    (team) => team.name.toLowerCase() === newTeamName.trim().toLowerCase()
  );

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

  const generateCredentials = () => {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const randomPass = Math.floor(1000 + Math.random() * 9000);
    return {
      teamId: `T-${randomId}`,
      passcode: `${randomPass}`
    };
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim() || isDuplicateName) return;

    const { teamId, passcode } = generateCredentials();

    const newTeam = {
      teamId,
      name: newTeamName.trim(),
      category: newTeamCategory,
      status: "Available",
      passcode,
      memberCount: 0,
      createdAt: Date.now()
    };

    try {
      await addDoc(collection(db, "teams"), newTeam);
      
      // ✅ SUCCESS POPUP
      showPopup(
        "success",
        "Team Created 🎉",
        `${newTeamName} has been successfully registered with Team ID: ${teamId}`
      );

      setIsCreateModalOpen(false);
      setNewTeamName("");
      setNewTeamCategory("Pothole");
      fetchTeams();
    } catch (error) {
      showPopup("error", "Creation Failed", "Could not create the team. Please try again.");
    }
  };

  const confirmDelete = (id: string) => {
    setTeamToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    await deleteDoc(doc(db, "teams", teamToDelete));
    setTeams(teams.filter(t => t.id !== teamToDelete));
    setIsDeleteModalOpen(false);
    setTeamToDelete(null);
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
            onClick={() => setIsCreateModalOpen(true)}
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
                
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
                    <HiOutlineBriefcase className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => confirmDelete(team.id)}
                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition active:scale-[0.90]"
                    title="Delete Team"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-gray-900">{team.name}</h3>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                  {team.category}
                </span>

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

      {/* --- CREATE MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl transform scale-100 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Create Work Team</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                    <HiXMark className="w-6 h-6" />
                </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Team Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Alpha Road Unit"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className={`w-full border rounded-xl p-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all placeholder-gray-400 ${
                    isDuplicateName ? 'border-red-500 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {isDuplicateName && (
                  <p className="text-[11px] text-red-500 mt-2 ml-1 font-medium flex items-center gap-1">
                    <HiOutlineExclamationCircle /> This team name is already in use.
                  </p>
                )}
              </div>

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
                    <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                        <HiChevronDown className="w-4 h-4" />
                    </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl 
                           hover:bg-slate-50 transition active:scale-[0.97]"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddTeam}
                disabled={!newTeamName.trim() || isDuplicateName}
                className="flex-1 py-3 text-sm font-semibold text-white bg-black rounded-xl 
                           hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.97]"
              >
                Create Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl transform scale-100 border border-gray-100 text-center">
            
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-50 text-red-600 rounded-full ring-8 ring-red-50/50">
                <HiOutlineExclamationCircle className="w-8 h-8" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Work Team?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed px-2">
              This will permanently remove this team and its access credentials. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl 
                           hover:bg-slate-50 transition active:scale-[0.97]"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteTeam}
                className="flex-1 py-3 text-sm font-semibold text-white bg-red-600 rounded-xl 
                           hover:bg-red-700 transition active:scale-[0.97]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ POPUP MESSAGE COMPONENT */}
      {popup && (
        <PopupMessage
          type={popup.type}
          title={popup.title}
          message={popup.message}
          onClose={() => setPopup(null)}
        />
      )}

    </div>
  );
};

export default Teams;