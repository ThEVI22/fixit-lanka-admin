import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, onSnapshot, query, where, addDoc,
  getDocs, doc, updateDoc, deleteDoc, getDoc
} from "firebase/firestore";
import {
  HiOutlineUserGroup, HiOutlinePlus, HiOutlinePencilSquare,
  HiOutlineTrash, HiOutlineEye, HiOutlineXMark, HiOutlineShieldCheck,
  HiOutlineExclamationTriangle, HiOutlineBriefcase
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import PopupMessage from "../components/PopupMessage";

// ✅ EMAIL SERVICE IMPORT
import { sendTeamAssignmentEmail, sendSupervisorReplacementEmail, sendSupervisorRelievedEmail } from "../services/emailService";

const Teams: React.FC = () => {
  // --- States ---
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false); // ✅ Added for form submission animation

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [supervisorDetails, setSupervisorDetails] = useState<any>(null);
  const [availableSupervisors, setAvailableSupervisors] = useState<any[]>([]);

  const [teamName, setTeamName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Pothole Maintenance");
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [popup, setPopup] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);

  const [actionConfirm, setActionConfirm] = useState<{ team: any, type: 'update' | 'delete', payload?: any, reportId?: string, reportLoc?: string, supervisorName?: string } | null>(null);
  const navigate = useNavigate();

  // Helper to fetch context
  const fetchReportContext = async (reportId: string) => {
    if (!reportId) return "";
    try {
      const rDoc = await getDoc(doc(db, "all_reports", reportId));
      if (rDoc.exists()) {
        return rDoc.data().locationName || rDoc.data().address || "Unknown Location";
      }
    } catch (e) { console.error("Error fetching report context", e); }
    return "";
  };

  const categories = [
    { value: "Pothole Maintenance", label: "Pothole Maintenance" },
    { value: "Drainage", label: "Drainage / Sewer" },
    { value: "Streetlight", label: "Street Lights" },
    { value: "Signage", label: "Signage Repair" }
  ];

  const hasChanges = isEditMode && selectedTeam ? (
    teamName !== selectedTeam.teamName ||
    selectedCategory !== selectedTeam.category ||
    selectedSupervisor !== selectedTeam.supervisorEmail
  ) : teamName !== "" && selectedSupervisor !== "";

  useEffect(() => {
    const q = query(collection(db, "teams"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const fetchSupervisors = async () => {
      const q = query(
        collection(db, "staff"),
        where("role", "==", "Supervisor"),
        where("specialization", "==", selectedCategory),
        where("status", "==", "Available")
      );
      const snap = await getDocs(q);
      const sups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAvailableSupervisors(sups);

      if (isEditMode && selectedTeam) {
        const currentSupDoc = await getDoc(doc(db, "staff", selectedTeam.supervisorEmail));
        const currentSupData = currentSupDoc.data();

        if (currentSupData && currentSupData.specialization !== selectedCategory) {
          if (selectedSupervisor === selectedTeam.supervisorEmail) {
            setSelectedSupervisor("");
            setPopup({
              type: "error",
              title: "Specialization Conflict",
              message: "The current supervisor is not qualified for this category. Please select a new lead."
            });
          }
        }
      }
    };

    fetchSupervisors();
  }, [selectedCategory, isModalOpen]);

  const handleViewDetails = async (team: any) => {
    setSelectedTeam(team);
    setSupervisorDetails(null);
    const staffDoc = await getDoc(doc(db, "staff", team.supervisorEmail));
    if (staffDoc.exists()) setSupervisorDetails(staffDoc.data());
    setIsDetailsOpen(true);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availableSupervisors.length === 0 && !isEditMode) return;

    setRegLoading(true); // ✅ Start loading
    try {
      const teamId = `T-${Math.floor(1000 + Math.random() * 9000)}`;
      const passcode = Math.floor(1000 + Math.random() * 9000).toString();

      await addDoc(collection(db, "teams"), {
        teamName, teamId, passcode,
        category: selectedCategory,
        supervisorEmail: selectedSupervisor,
        status: "Active",
        createdAt: Date.now()
      });

      await updateDoc(doc(db, "staff", selectedSupervisor), {
        status: "In-Work",
        currentTeamId: teamId
      });

      await sendTeamAssignmentEmail({
        email: selectedSupervisor,
        teamName: teamName,
        passcode: passcode,
        teamId: teamId
      });

      setPopup({ type: "success", title: "Success", message: `Team initialized. Notification sent to supervisor.` });
      setTeamName("");
      setSelectedSupervisor("");
      setIsModalOpen(false);
    } catch (err) {
      setPopup({ type: "error", title: "Error", message: "Failed to initialize team." });
    } finally {
      setRegLoading(false); // ✅ Stop loading
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ SMART RESTRICTION: Guided Flow for SUPERVISOR CHANGE
    const oldEmail = selectedTeam.supervisorEmail;
    const supervisorChanged = oldEmail !== selectedSupervisor;

    if (supervisorChanged) {
      // Check if OLD supervisor is busy
      const oldSupDoc = await getDoc(doc(db, "staff", oldEmail));
      const oldSupData = oldSupDoc.data();

      if (oldSupData && oldSupData.status === "In-Work") {
        let rLoc = await fetchReportContext(oldSupData.currentReportId || "");
        setActionConfirm({
          team: selectedTeam,
          type: 'update',
          payload: { oldEmail, newEmail: selectedSupervisor }, // Store needed data
          reportId: oldSupData.currentReportId,
          reportLoc: rLoc,
          supervisorName: oldSupData.fullName
        });
        return;
      }
    }

    await executeUpdate();
  };

  const executeUpdate = async () => {
    setRegLoading(true);
    try {
      const oldEmail = selectedTeam.supervisorEmail;
      const supervisorChanged = oldEmail !== selectedSupervisor;

      if (supervisorChanged) {
        // 1. Release Old Supervisor
        await updateDoc(doc(db, "staff", oldEmail), { status: "Available", currentTeamId: null });
        // 2. Assign New Supervisor
        await updateDoc(doc(db, "staff", selectedSupervisor), { status: "In-Work", currentTeamId: selectedTeam.teamId });
      }

      await updateDoc(doc(db, "teams", selectedTeam.id), {
        teamName, category: selectedCategory, supervisorEmail: selectedSupervisor
      });

      // Explicit Email Logic
      const previousSupervisorEmail = selectedTeam.supervisorEmail;
      const newSupervisorEmail = selectedSupervisor;

      if (supervisorChanged && previousSupervisorEmail && newSupervisorEmail) {
        // 1. Notify OLD Supervisor (Strictly to previous email)
        await sendSupervisorRelievedEmail({
          email: previousSupervisorEmail,
          teamName: selectedTeam.teamName
        });

        // 2. Notify NEW Supervisor (Strictly to new email)
        await sendSupervisorReplacementEmail({
          email: newSupervisorEmail,
          teamName: teamName,
          passcode: selectedTeam.passcode,
          teamId: selectedTeam.teamId
        });
      } else {
        // Standard Update Notification (Same Supervisor)
        await sendTeamAssignmentEmail({
          email: selectedSupervisor,
          teamName: teamName,
          passcode: selectedTeam.passcode,
          teamId: selectedTeam.teamId
        });
      }

      setPopup({ type: "success", title: "Updated", message: supervisorChanged ? "Leadership transferred successfully." : "Team details updated." });
      setIsModalOpen(false);
    } catch (err) {
      setPopup({ type: "error", title: "Error", message: "Update failed." });
    } finally {
      setRegLoading(false);
      setActionConfirm(null);
    }
  };

  const processDeletion = async () => {
    if (!teamToDelete) return;

    // ✅ SMART RESTRICTION: Guided Flow for DELETION
    // Check Supervisor status
    const supDoc = await getDoc(doc(db, "staff", teamToDelete.supervisorEmail));
    const supData = supDoc.data();

    if (supData && supData.status === "In-Work") {
      let rLoc = await fetchReportContext(supData.currentReportId || "");
      setActionConfirm({
        team: teamToDelete,
        type: 'delete',
        reportId: supData.currentReportId,
        reportLoc: rLoc,
        supervisorName: supData.fullName
      });
      setTeamToDelete(null); // Close the basic confirm
      return;
    }

    await executeDelete(teamToDelete);
  };

  const executeDelete = async (team: any) => {
    try {
      await deleteDoc(doc(db, "teams", team.id));
      await updateDoc(doc(db, "staff", team.supervisorEmail), { status: "Available", currentTeamId: null }); // Force release logic remains for clean up
      setPopup({ type: "success", title: "Deleted", message: "Team dissolved and supervisor released." });
      setTeamToDelete(null);
    } catch (err) {
      setPopup({ type: "error", title: "Error", message: "Could not remove team." });
    }
    setActionConfirm(null);
  };

  const btnBlack = "bg-black text-white px-8 py-3 rounded-xl font-bold shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2";

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          {/* Date placeholder to match Reports style consistency if desired, or just keeping structure */}
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overview</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Teams Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Official RDA maintenance units management.</p>
        </div>
        <button onClick={() => { setIsEditMode(false); setTeamName(""); setSelectedSupervisor(""); setIsModalOpen(true); }} className={btnBlack}>
          <HiOutlinePlus /> Create Team
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Team Unit</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supervisor</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-black rounded-full animate-spin"></div>
                    <span className="text-sm font-medium tracking-tight">Syncing maintenance units...</span>
                  </div>
                </td>
              </tr>
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-24 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-slate-50 p-4 rounded-full">
                      <HiOutlineUserGroup size={32} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">No active teams found</p>
                      <p className="text-xs">Initialize your first unit to begin operations.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{team.teamName}</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">ID: {team.teamId}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-600 uppercase border border-slate-200">
                      {categories.find(c => c.value === team.category)?.label || team.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700 font-medium">{team.supervisorEmail}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleViewDetails(team)} className="p-2.5 hover:bg-blue-50 rounded-xl transition-all text-slate-400 hover:text-blue-600 active:scale-90"><HiOutlineEye size={18} /></button>
                      <button onClick={() => { setSelectedTeam(team); setTeamName(team.teamName); setSelectedCategory(team.category); setSelectedSupervisor(team.supervisorEmail); setIsEditMode(true); setIsModalOpen(true); }} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-black active:scale-90"><HiOutlinePencilSquare size={18} /></button>
                      <button onClick={() => setTeamToDelete(team)} className="p-2.5 hover:bg-red-50 rounded-xl transition-all text-slate-400 hover:text-red-500 active:scale-90"><HiOutlineTrash size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL: CREATE / EDIT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in-95 duration-200 text-left border border-slate-100 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-2 text-slate-900">{isEditMode ? "Update Team Unit" : "New Team Unit"}</h2>
            <p className="text-slate-500 text-sm mb-8">Define team parameters and specialized leadership.</p>

            <form onSubmit={isEditMode ? handleUpdateTeam : handleCreateTeam} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Team Identity Name</label>
                <input required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Type unit name (e.g. Alpha Unit 01)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-black transition-all" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Work Category</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-black transition-all">
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assign Supervisor</label>
                <select required value={selectedSupervisor} onChange={(e) => setSelectedSupervisor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-black transition-all">
                  {availableSupervisors.length > 0 ? (
                    <>
                      <option value="">Choose Personnel...</option>
                      {isEditMode && supervisorDetails?.specialization === selectedCategory && (
                        <option value={selectedTeam.supervisorEmail}>Current Lead: {selectedTeam.supervisorEmail}</option>
                      )}
                      {availableSupervisors.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.staffId})</option>)}
                    </>
                  ) : (
                    <option value="">No Available Supervisors for this category</option>
                  )}
                </select>
                {availableSupervisors.length === 0 && !isEditMode && (
                  <p className="text-red-500 text-[10px] mt-2 font-bold uppercase tracking-tight flex items-center gap-1">
                    <HiOutlineExclamationTriangle /> Warning: Add and set a supervisor to 'Available' for this category first.
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                <button type="submit" disabled={!hasChanges || regLoading || (availableSupervisors.length === 0 && !isEditMode)} className={`flex-1 ${btnBlack}`}>
                  {/* ✅ Loading Animation logic */}
                  {regLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>{isEditMode ? "Saving..." : "Initializing..."}</span>
                    </div>
                  ) : (
                    isEditMode ? "Save Changes" : "Initialize Unit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: VIEW DETAILS --- */}
      {isDetailsOpen && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-left">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-start mb-8 text-left">
              <div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter border border-blue-100 mb-2 inline-block">Unit Profile</span>
                <h2 className="text-2xl font-bold text-slate-900">{selectedTeam.teamName}</h2>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-black">
                <HiOutlineXMark size={24} />
              </button>
            </div>

            <div className="space-y-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Login Passcode</p>
                  <p className="text-lg font-mono font-bold text-blue-600">{selectedTeam.passcode}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Unit ID</p>
                  <p className="text-sm font-mono font-bold text-slate-800">{selectedTeam.teamId}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-3 px-1">Active Lead Supervisor</label>
                <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <HiOutlineShieldCheck size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{supervisorDetails?.fullName || "Resolving Name..."}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{selectedTeam.supervisorEmail}</p>
                    <p className="text-[10px] text-emerald-600 font-extrabold uppercase mt-1">Staff ID: {supervisorDetails?.staffId || "---"}</p>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setIsDetailsOpen(false)} className={`w-full mt-10 py-4 ${btnBlack}`}>
              Dismiss Details
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: DISSOLVE CONFIRM --- */}
      {/* ✅ GUIDED ACTIVE WORK CONFIRMATION */}
      {actionConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
              <HiOutlineBriefcase size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">Active Operations</h3>
            <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed">
              Supervisor <b className="text-slate-900">{actionConfirm.supervisorName}</b> is currently leading a team in an active job.
              <br />
              {actionConfirm.type === 'delete' && <span className="text-red-500 font-bold block mt-1">Dissolving team will Force Release them.</span>}
              {actionConfirm.type === 'update' && <span className="text-amber-600 font-bold block mt-1">Changing leadership will Force Release them.</span>}

              {actionConfirm.reportId && (
                <span className="block mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Active Job</span>
                  <span className="font-bold text-slate-900 block">Report #{actionConfirm.reportId.slice(0, 5)}...</span>
                  <span className="text-xs text-slate-500 block">{actionConfirm.reportLoc}</span>
                </span>
              )}
            </p>

            <div className="space-y-3">
              {actionConfirm.reportId && (
                <button
                  onClick={() => navigate(`/report/${actionConfirm.reportId}`)}
                  className="w-full py-4 bg-black text-white font-bold rounded-2xl flex items-center justify-center gap-2"
                >
                  View Report
                </button>
              )}

              <button
                onClick={() => setActionConfirm(null)}
                className={`w-full py-4 font-bold rounded-2xl ${actionConfirm.reportId ? 'bg-gray-100 text-slate-600' : 'bg-black text-white'}`}
              >
                {actionConfirm.reportId ? 'Close' : 'Cancel'}
              </button>

              <button
                onClick={() => {
                  if (actionConfirm.type === 'update') executeUpdate();
                  if (actionConfirm.type === 'delete') executeDelete(actionConfirm.team);
                }}
                className="block w-full text-xs font-bold text-red-500 py-2 hover:underline"
              >
                Advanced: Force {actionConfirm.type === 'delete' ? 'Dissolve' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {teamToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95 duration-200 text-center border border-slate-100/50">

            <div className="w-16 h-16 bg-slate-50 text-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <HiOutlineExclamationTriangle size={28} />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Dissolve Unit?</h3>
            <p className="text-slate-500 text-sm mb-10 px-4 leading-relaxed">
              Dissolve <b className="text-slate-900">{teamToDelete.teamName}</b>? The lead personnel will be released for new assignments immediately.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTeamToDelete(null)}
                className="py-3.5 px-6 font-bold text-slate-500 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={processDeletion}
                className="py-3.5 px-6 bg-black text-white font-bold rounded-2xl transition-all hover:bg-zinc-800 active:scale-95 shadow-lg shadow-black/5"
              >
                Dissolve
              </button>
            </div>
          </div>
        </div>
      )}

      {popup && <PopupMessage {...popup} onClose={() => setPopup(null)} />}
    </div>
  );
};

export default Teams;