// ------------------------------------------------------
// ReportDetails.tsx — Final (Sends Notifications to User)
// ------------------------------------------------------
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  doc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  addDoc // 👈 ADDED THIS
} from "firebase/firestore";
import { db } from "../firebase";

import {
  HiCheckCircle,
  HiClock,
  HiOutlineExclamationCircle,
  HiOutlineUserCircle,
  HiOutlineEnvelope,
  HiOutlineFingerPrint,
  HiOutlineArrowLeft,
  HiPhoto,
  HiXMark,
  HiOutlineMapPin,
  HiOutlineTag,
  HiOutlineBriefcase,
  HiChevronDown,
  HiOutlineCalendar,
  HiOutlinePause
} from "react-icons/hi2";

// ... (StatusPill and ImageModal components remain the same) ...
const statusColor: Record<string, string> = {
  Submitted: "bg-amber-100 text-amber-700 border border-amber-200",
  Pending: "bg-amber-100 text-amber-700 border border-amber-200",
  "In-progress": "bg-blue-100 text-blue-700 border border-blue-200",
  Declined: "bg-red-100 text-red-700 border border-red-200",
  "On-Hold": "bg-orange-100 text-orange-700 border border-orange-200", 
  Resolved: "bg-green-100 text-green-700 border border-green-200",     
};

const StatusPill = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center justify-center
                min-w-[90px] h-[28px] px-3 
                rounded-full text-[11px] font-medium
                ${statusColor[status] || "bg-gray-50 text-gray-600 border border-gray-200"}`}
  >
    {status === "Submitted" ? "Pending Approval" : status === "Pending" ? "Pending Assignment" : status}
  </span>
);

const ImageModal = ({ img, onClose }: any) => {
  if (!img) return null;
  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-fadeIn"
      onClick={onClose}
    >
      <img
        src={img}
        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
        alt="Evidence Preview"
      />
    </div>
  );
};

// ---------------------------------------------------
//    MAIN COMPONENT
// ---------------------------------------------------
const ReportDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState<any>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  // Actions States
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclineMode, setIsDeclineMode] = useState(false);
  
  // Assignment Logic States
  const [isAssignMode, setIsAssignMode] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  // --- 1. Fetch Report Data (Real-time) ---
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "all_reports", id), (doc) => {
       if (doc.exists()) {
         setReport({ id: doc.id, ...doc.data() });
       }
    });
    return () => unsub();
  }, [id]);

  // --- 2. Fetch Timeline Events ---
  useEffect(() => {
    if (!id) return;
    
    const q = query(
      collection(db, "notifications"), 
      where("reportId", "==", id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        let ts = 0;
        if (data.timestamp?.seconds) {
           ts = data.timestamp.seconds * 1000;
        } else if (typeof data.timestamp === 'number') {
           ts = data.timestamp;
        } else if (data.timestamp instanceof Date) {
           ts = data.timestamp.getTime();
        } else {
           ts = Date.now(); 
        }
        return { id: doc.id, ...data, sortTime: ts };
      });

      events.sort((a, b) => b.sortTime - a.sortTime); // Sort Newest First
      setTimelineEvents(events);
    });
    return () => unsub();
  }, [id]);

  // --- HELPER: Send Notification (NEW FUNCTION) ---
  const sendNotification = async (title: string, message: string) => {
    if (!id) return;
    try {
      await addDoc(collection(db, "notifications"), {
        title,
        message,
        reportId: id,
        timestamp: new Date(), // Use current time
        isRead: false,
        type: "admin_update"
      });
    } catch (error) {
      console.error("Error sending notification", error);
    }
  };

  // --- HELPER: Fetch Teams ---
  const fetchMatchingTeams = async () => {
    if (!report?.category) return;
    setIsLoadingTeams(true);
    try {
      const q = query(
        collection(db, "teams"), 
        where("category", "==", report.category)
      );
      const snap = await getDocs(q);
      const teamsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAvailableTeams(teamsList);
    } catch (error) {
      console.error("Error fetching teams", error);
    }
    setIsLoadingTeams(false);
  };

  const openAssignModal = () => {
    setIsAssignMode(true);
    fetchMatchingTeams();
  };

  // --- ACTION HANDLERS (UPDATED) ---
  
  const handleApprove = async () => {
    await updateDoc(doc(db, "all_reports", id!), { status: "Pending" });
    // ✅ Notify User
    await sendNotification("Report Approved", "Your report has been verified and approved by the admin.");
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) return;
    await updateDoc(doc(db, "all_reports", id!), {
      status: "Declined",
      declineReason,
    });
    // ✅ Notify User
    await sendNotification("Report Declined", `Reason: ${declineReason}`);
    setIsDeclineMode(false);
  };

  const handleAssignTeam = async () => {
    if (!selectedTeam) return;
    const teamDetails = availableTeams.find(t => t.id === selectedTeam);
    await updateDoc(doc(db, "all_reports", id!), {
      status: "In-progress",
      assignedTeamId: teamDetails.teamId,
      assignedTeamName: teamDetails.name,
      assignedAt: Date.now()
    });
    // ✅ Notify User
    await sendNotification("Team Assigned", `Work assigned to ${teamDetails.name}.`);
    setIsAssignMode(false);
  };

  // --- HELPER: Date Formatter ---
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  };

  if (!report)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-gray-200 rounded-full mb-2"></div>
          <p className="text-gray-400 text-sm font-medium">Loading report...</p>
        </div>
      </div>
    );

  // ... (The rest of your JSX/HTML remains exactly the same as before) ...
  // ... Paste the rest of the render code (Modals, Headers, Content Grid) here ...
  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900 selection:bg-gray-200">
      
      <ImageModal img={imgPreview} onClose={() => setImgPreview(null)} />

      {/* --- DECLINE MODAL --- */}
      {isDeclineMode && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-[420px] text-center shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="flex justify-center mb-5">
              <div className="p-4 bg-red-50 text-red-600 rounded-full ring-8 ring-red-50/50">
                <HiOutlineExclamationCircle className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Report Decline</h3>
            <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
              You are about to permanently decline report: <br />
              <span className="font-bold text-gray-900 text-lg block mt-1 mb-1">{report.adminReportId}</span>
            </p>
            <div className="mb-6 text-left">
              <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1 uppercase tracking-wider">Reason</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Duplicate report..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 h-28 focus:ring-2 focus:ring-black/5 focus:border-black outline-none resize-none shadow-sm"
              />
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsDeclineMode(false)} className="flex-1 py-3 text-sm font-medium rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleDecline} disabled={!declineReason.trim()} className="flex-1 py-3 text-sm font-semibold rounded-xl bg-black text-white shadow-md hover:opacity-90 disabled:opacity-50">Confirm Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* --- ASSIGN TEAM MODAL --- */}
      {isAssignMode && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-[420px] text-center shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="flex justify-center mb-5">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-full ring-8 ring-blue-50/50">
                <HiOutlineBriefcase className="w-8 h-8" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Assign Work Team</h3>
            <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
              Select a <strong>{report.category}</strong> unit to handle report <span className="font-bold text-gray-900">{report.adminReportId}</span>.
            </p>
            <div className="mb-8 text-left">
              <label className="block text-xs font-semibold text-gray-500 mb-2 ml-1 uppercase tracking-wider">Select Team</label>
              <div className="relative">
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  disabled={isLoadingTeams}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-black outline-none appearance-none cursor-pointer transition-all font-medium text-gray-700 disabled:opacity-50"
                >
                  <option value="" disabled>Select a team...</option>
                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name} ({team.teamId})</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                   {isLoadingTeams ? <span className="text-xs">Loading...</span> : <HiChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsAssignMode(false)} className="flex-1 py-3 text-sm font-medium rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition">Cancel</button>
              <button onClick={handleAssignTeam} disabled={!selectedTeam} className="flex-1 py-3 text-sm font-semibold rounded-xl bg-black text-white shadow-md hover:opacity-90 disabled:opacity-50">Assign Team</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="max-w-6xl mx-auto pt-10 px-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 font-medium mb-3 transition-colors">
              <div className="p-1 rounded-full group-hover:bg-gray-200 transition-colors"><HiOutlineArrowLeft className="w-4 h-4" /></div>
              Back to reports
            </button>
            <h1 className="text-3xl font-semibold text-gray-900">{report.adminReportId}</h1>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
              <HiClock className="w-4 h-4 text-gray-400" />
              Created on {new Date(report.createdAtMs).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {report.status === "Submitted" && (
              <>
                <button onClick={() => setIsDeclineMode(true)} className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all">Decline</button>
                <button onClick={handleApprove} className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-semibold shadow-md hover:opacity-90 transition-all">Approve Report</button>
              </>
            )}
            {report.status === "Pending" && (
                <button onClick={openAssignModal} className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-semibold shadow-md hover:opacity-90 transition-all">Assign Team</button>
            )}
          </div>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === LEFT COLUMN === */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CARD 1: Report Details */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white">
              <h3 className="font-semibold text-gray-900 text-lg">Report Details</h3>
              <StatusPill status={report.status} />
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                 <div>
                   <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Issue Category</span>
                   <p className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
                      <HiOutlineTag className="w-4 h-4 text-gray-400"/> {report.category}
                   </p>
                 </div>
                 
                 {/* TARGET DATE WITH OVERDUE LOGIC */}
                 {report.estimatedDate && (() => {
                    const estDate = new Date(report.estimatedDate.seconds * 1000);
                    const now = new Date();
                    const isOverdue = now > estDate && report.status !== "Resolved";
                    const diffTime = Math.abs(now.getTime() - estDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                    return (
                      <div className={`p-3 rounded-xl border ${isOverdue ? "bg-red-50 border-red-100" : "bg-transparent border-transparent"}`}>
                         <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isOverdue ? "text-red-600" : "text-blue-500"}`}>
                               {isOverdue ? "⚠️ Overdue Deadline" : "Target Completion"}
                            </span>
                            {isOverdue && (
                               <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                  {diffDays} Day{diffDays > 1 ? 's' : ''} Late
                               </span>
                            )}
                         </div>
                         <p className={`text-base font-semibold mt-1 flex items-center gap-2 ${isOverdue ? "text-red-700" : "text-gray-900"}`}>
                            <HiOutlineCalendar className={`w-4 h-4 ${isOverdue ? "text-red-500" : "text-blue-500"}`}/> 
                            {estDate.toLocaleDateString("en-GB")}
                         </p>
                      </div>
                    );
                 })()}

              </div>
              
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</span>
                <div className="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600 leading-relaxed">
                  {report.description}
                </div>
              </div>

              {/* PROOF OF COMPLETION */}
              {report.proofPhoto && (
                <div className="mt-8 pt-6 border-t border-gray-100 animate-fadeIn">
                  <span className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-2 mb-3">
                     <HiCheckCircle className="w-4 h-4"/> Completion Proof (Worker Upload)
                  </span>
                  <div 
                    className="relative w-full h-56 bg-gray-50 rounded-2xl overflow-hidden cursor-pointer border border-green-100 group shadow-sm"
                    onClick={() => setImgPreview(report.proofPhoto)}
                  >
                    <img 
                      src={report.proofPhoto} 
                      alt="Proof of work" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="bg-black/50 text-white text-xs font-medium px-4 py-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <HiPhoto className="w-3 h-3"/> View Evidence
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* CARD 2: Evidence Gallery */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 text-lg">User Evidence</h3>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{report.photos?.length || 0} Images</span>
            </div>
            <div className="p-6">
              {report.photos && report.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {report.photos.map((img: string, index: number) => (
                    <div key={index} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer border border-gray-200" onClick={() => setImgPreview(img)}>
                      <img src={img} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                         <HiPhoto className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-md transition-opacity duration-300"/>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                  <div className="p-3 bg-white rounded-full shadow-sm mb-3"><HiPhoto className="w-6 h-6 text-gray-300" /></div>
                  <p className="text-sm font-medium text-gray-500">No evidence attached</p>
                </div>
              )}
            </div>
          </div>

          {/* STATUS BANNERS */}
          <div className="space-y-4">
            
            {/* 1. SUBMITTED */}
            {report.status === "Submitted" && (
              <div className="p-5 bg-white border border-amber-100 rounded-2xl text-gray-900 flex items-start gap-4 shadow-[0_2px_8px_rgba(251,191,36,0.1)]">
                <div className="p-2 bg-amber-50 rounded-full text-amber-600 shadow-sm ring-1 ring-amber-100 flex-shrink-0"><HiClock className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-base">Awaiting Review</p>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">This report has been submitted by the user and is waiting for administrative action.</p>
                </div>
              </div>
            )}

            {/* 2. PENDING */}
            {report.status === "Pending" && (
              <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-900 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-white rounded-full text-amber-600 shadow-sm ring-1 ring-amber-100 flex-shrink-0"><HiCheckCircle className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-base">Approved / Pending Assignment</p>
                  <p className="mt-1 text-sm text-amber-700 leading-relaxed">This report has been approved and is currently in the queue for work team assignment.</p>
                </div>
              </div>
            )}

            {/* 3. IN PROGRESS */}
            {report.status === "In-progress" && (
              <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-blue-900 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-white rounded-full text-blue-600 shadow-sm ring-1 ring-blue-100 flex-shrink-0"><HiOutlineBriefcase className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-base">In Progress / Assigned</p>
                  <p className="mt-1 text-sm text-blue-700 leading-relaxed">
                    Assigned to: <span className="font-bold">{report.assignedTeamName}</span>. <br/>
                    Work team has been notified.
                  </p>
                </div>
              </div>
            )}

            {/* 4. DECLINED */}
            {report.status === "Declined" && (
              <div className="p-5 bg-red-50 border border-red-100 rounded-2xl text-red-900 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-white rounded-full text-red-600 shadow-sm ring-1 ring-red-100 flex-shrink-0"><HiXMark className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-base">Declined</p>
                  <p className="mt-1 text-sm text-red-700">Reason: {report.declineReason}</p>
                </div>
              </div>
            )}
            
            {/* 5. ON HOLD */}
            {report.status === "On-Hold" && (
              <div className="p-5 bg-orange-50 border border-orange-100 rounded-2xl text-orange-900 flex items-start gap-4 shadow-sm animate-fadeIn">
                <div className="p-2 bg-white rounded-full text-orange-600 shadow-sm ring-1 ring-orange-100 flex-shrink-0"><HiOutlinePause className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-base">Work Paused (On-Hold)</p>
                  <p className="mt-1 text-sm text-orange-800">
                     <strong>Reason:</strong> {report.onHoldReason || "Not specified."}
                  </p>
                </div>
              </div>
            )}

            {/* 6. RESOLVED */}
            {report.status === "Resolved" && (
              <div className="p-5 bg-green-50 border border-green-100 rounded-2xl text-green-900 flex items-start gap-4 shadow-sm animate-fadeIn">
                <div className="p-2 bg-white rounded-full text-green-600 shadow-sm ring-1 ring-green-100 flex-shrink-0"><HiCheckCircle className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-base">Job Completed</p>
                  <p className="mt-1 text-sm text-green-800">Worker has marked this job as resolved and proof has been verified.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === RIGHT COLUMN === */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6 border-b border-gray-50 pb-3">Reporter</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 ring-4 ring-blue-50/50"><HiOutlineUserCircle className="w-7 h-7" /></div>
              <div>
                <p className="text-base font-semibold text-gray-900">{report.fullName}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mt-1">Resident</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-600"><HiOutlineEnvelope className="w-4 h-4 text-gray-400" /> <a href={`mailto:${report.email}`} className="hover:underline">{report.email}</a></div>
              <div className="flex items-center gap-3 text-sm text-gray-600"><HiOutlineFingerPrint className="w-4 h-4 text-gray-400" /> <span className="font-mono">{report.nic}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
               <HiOutlineMapPin className="text-gray-400 w-5 h-5"/>
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Location</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed pl-1">{report.locationName}</p>
          </div>

          {/* CARD 5: ACTIVITY TIMELINE */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
               <HiClock className="text-gray-400 w-5 h-5"/>
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Activity Log</h3>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {timelineEvents.length === 0 ? (
                 <p className="text-xs text-gray-400 text-center py-4">No activity yet.</p>
              ) : (
                 <div className="relative border-l border-gray-200 ml-2 space-y-6">
                   {timelineEvents.map((event) => (
                     <div key={event.id} className="ml-4 relative">
                       <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-white 
                          ${event.title.includes("Started") ? "bg-blue-500" : 
                            event.title.includes("Completed") ? "bg-green-500" : 
                            event.title.includes("Paused") || event.title.includes("On-Hold") ? "bg-orange-500" : "bg-gray-400"}`} 
                       />
                       <p className="text-xs text-gray-400 mb-0.5">{formatDate(event.timestamp)}</p>
                       <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                       <p className="text-xs text-gray-500 mt-0.5">{event.message}</p>
                     </div>
                   ))}
                 </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportDetails;