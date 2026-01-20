// ------------------------------------------------------
// ReportDetails.tsx — Professional Oversight Version
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
  getDoc,
  onSnapshot,
  addDoc
} from "firebase/firestore";
import { db } from "../firebase";
import PopupMessage from "../components/PopupMessage";
import {
  HiCheckCircle,
  HiClock,
  HiOutlineArrowLeft,
  HiOutlineMapPin,
  HiOutlineTag,
  HiOutlineBriefcase,
  HiChevronDown,
  HiOutlineNoSymbol,
  HiOutlineCalendar,
  HiOutlinePause,
  HiOutlineUsers,
  HiOutlineFingerPrint,
  HiOutlineEnvelope
} from "react-icons/hi2";

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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-fadeIn" onClick={onClose}>
      <img src={img} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()} alt="Preview" />
    </div>
  );
};

// ✅ NEW: Attendance Modal for Admin Review
const AttendanceModal = ({ workerId, workerName, reportId, onClose }: any) => {
  const [history, setHistory] = useState<any[]>([]);
  const [debugId, setDebugId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendanceHistory = async () => {
      try {
        // 1. Resolve Staff ID (Worker App uses 'staffId' like W-1234, but we have Doc ID)
        const staffSnap = await getDoc(doc(db, "staff", workerId));

        let searchIds = [workerId];

        if (staffSnap.exists()) {
          const staffData = staffSnap.data();
          if (staffData.staffId) {
            searchIds.push(staffData.staffId); // Add Staff ID to search list
          }
        }

        // Remove duplicates and empty strings
        searchIds = [...new Set(searchIds.filter(Boolean))];

        // 2. Fetch ALL Attendance Records for this Worker (Robust Search)
        const q = query(
          collection(db, "attendance"),
          where("workerId", "in", searchIds),  // ✅ Search for BOTH ID formats
          where("taskId", "==", reportId)      // ✅ STRICT Scope by Report ID
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          const records = snap.docs.map(d => d.data());
          // Client-side sort by timestamp desc
          records.sort((a: any, b: any) => {
            const tA = a.timestamp?.seconds || 0;
            const tB = b.timestamp?.seconds || 0;
            return tB - tA;
          });
          setHistory(records);
        } else {
          // Debug fallback
          setDebugId(`Search: ${searchIds.join(" | ")}`);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAttendanceHistory();
  }, [workerId]);

  const formatDate = (ts: any) => {
    if (!ts) return "Unknown Date";
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString("en-GB", { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const formatTime = (ts: any) => {
    if (!ts) return "--:--";
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily Attendance</p>
            <h3 className="font-bold text-lg text-gray-900">{workerName}</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-100"><HiOutlineNoSymbol className="w-4 h-4 text-gray-400" /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" /></div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((record, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${record.status === 'Completed' || record.status === 'Present' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      <HiCheckCircle />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{formatDate(record.checkIn || record.timestamp)}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[11px] font-bold text-gray-400 uppercase">IN: <span className="text-gray-900">{formatTime(record.checkIn)}</span></p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase">OUT: <span className="text-gray-900">{formatTime(record.checkOut)}</span></p>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${record.status === 'Late' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>{record.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 text-2xl"><HiOutlinePause /></div>
              <p className="font-bold text-gray-900">No History Found</p>
              <p className="text-sm text-gray-500 px-8 mt-2">No attendance records found for this worker.</p>
              <p className="text-[10px] text-gray-300 mt-4 bg-gray-50 inline-block px-2 py-1 rounded">Debug: {debugId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [isAssignMode, setIsAssignMode] = useState(false);
  const [isDeclineMode, setIsDeclineMode] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [popup, setPopup] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);

  // ✅ NEW: Attendance State
  const [viewWorker, setViewWorker] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "all_reports", id), (doc) => {
      if (doc.exists()) setReport({ id: doc.id, ...doc.data() });
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, "notifications"), where("reportId", "==", id));
    const unsub = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        let ts = data.timestamp?.seconds ? data.timestamp.seconds * 1000 : (typeof data.timestamp === 'number' ? data.timestamp : Date.now());
        return { id: doc.id, ...data, sortTime: ts };
      }).filter((e: any) =>
        e.target !== 'user' &&
        e.type !== 'team_update' && // ✅ Exclude internal team updates
        !e.title?.startsWith("You ") &&
        !e.message?.startsWith("Your ") &&
        !e.message?.startsWith("You ") &&
        e.type !== 'success'
      ); // ✅ Filter out user notifications & worker self-alerts
      events.sort((a: any, b: any) => b.sortTime - a.sortTime);

      // ✅ DEDUPLICATION & CLEANUP
      // Normalize titles to catch semantic duplicates (e.g., "Job Paused" vs "Job On Hold")
      const normalize = (t: string) => {
        t = t.trim();
        if (t === "Job Paused" || t === "Job On Hold") return "Job Suspended";
        if (t === "Job Resumed" || t === "Work Resumed") return "Job Resumed";
        if (t === "Job Started" || t === "Work Started") return "Job Started";
        return t;
      };

      const uniqueEvents = events.filter((event, index, self) => {
        if (index === 0) return true;
        const prev = self[index - 1];

        const currTitle = normalize(event.title || "");
        const prevTitle = normalize(prev.title || "");

        // If titles normalize to the same thing, treat as duplicate context
        // We also check if messages are similar or if it's just a double-fire
        const isDuplicate = currTitle === prevTitle;

        // If it's a duplicate type, we prefer the one that is "more descriptive" or just keep the first one (most recent)
        // Since we sorted by DESC, the first one is the LATEST. We keep the latest.
        // So we return FALSE (exclude) if it matches the previous (calculated from top down? No, filter runs 0..N)
        // uniqueEvents logic:
        // Actually, we are iterating 0..length. 0 is latest. 
        // If index 1 (older) matches index 0 (newer), we might want to drop index 1?
        // Wait, standard filter: keep if true.
        // If I compare with `prev` (index-1), I am comparing with a NEWER event (since sorted DESC).
        // If `curr` (older) == `prev` (newer), then `curr` is the duplicate OLD event. We should drop it.
        return !isDuplicate;
      });

      setTimelineEvents(uniqueEvents);
    });
    return () => unsub();
  }, [id]);

  // ✅ FIXED: Support for distinct User vs Supervisor targeting
  const sendNotification = async (title: string, message: string, targetTeamId: string = "", target: string = "user", type: string = "status_update") => {
    if (!id) return;
    try {
      await addDoc(collection(db, "notifications"), {
        title,
        message,
        reportId: id,
        targetTeamId, // Used by Supervisor App to key in
        target,       // 'user' | 'supervisor' | 'admin'
        timestamp: new Date(),
        isRead: false,
        type          // 'status_update' | 'assignment' | 'deadline_alert'
      });
    } catch (error) { console.error("Notification Error", error); }
  };

  const fetchMatchingTeams = async () => {
    if (!report?.category) return;
    try {
      let searchCategory = report.category;
      if (searchCategory === "Pothole") searchCategory = "Pothole Maintenance";
      if (searchCategory === "Drainage") searchCategory = "Drainage / Sewer";
      const q = query(collection(db, "teams"), where("category", "==", searchCategory));
      const snap = await getDocs(q);
      setAvailableTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) { console.error("Team Fetch Error", error); }
  };

  const handleApprove = async () => {
    try {
      await updateDoc(doc(db, "all_reports", id!), { status: "Pending" });
      await sendNotification("Report Approved", "Verified by admin. Awaiting unit assignment.", "", "user", "status_update");
      setPopup({ type: "success", title: "Success", message: "Report approved." });
    } catch (err) { setPopup({ type: "error", title: "Error", message: "Update failed." }); }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setPopup({ type: "error", title: "Reason Required", message: "Please provide a valid reason for rejection." });
      return;
    }
    try {
      await updateDoc(doc(db, "all_reports", id!), {
        status: "Declined",
        declineReason: declineReason.trim()
      });
      await sendNotification("Report Declined", `Rejected: ${declineReason}`, "", "user", "status_update");
      setIsDeclineMode(false);
      setPopup({ type: "success", title: "Declined", message: "Incident report has been rejected." });
    } catch (err) { setPopup({ type: "error", title: "Error", message: "Decline action failed." }); }
  };

  const handleAssignTeam = async () => {
    if (!selectedTeam) return;
    const team = availableTeams.find(t => t.id === selectedTeam);
    try {
      await updateDoc(doc(db, "all_reports", id!), {
        status: "In-progress",
        assignedTeamId: team.teamId,
        assignedTeamName: team.teamName,
        assignedAt: Date.now()
      });
      // 1. Notify Verification (To User)
      await sendNotification("New Report Assigned", `Maintenance unit ${team.teamName} has been assigned to this report.`, "", "user", "status_update");

      // 2. Notify Supervisor (Distinct Work Order Message)
      const reportRef = report.adminReportId || "Report";
      await sendNotification("New Work Order", `Job ${reportRef} has been assigned to your team. Please review details and proceed.`, team.teamId, "supervisor", "assignment");

      setIsAssignMode(false);
      setPopup({ type: "success", title: "Assigned", message: `${team.teamName} is now active.` });
    } catch (err) { setPopup({ type: "error", title: "Error", message: "Assignment failed." }); }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  };

  if (!report) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900 selection:bg-gray-200">
      <ImageModal img={imgPreview} onClose={() => setImgPreview(null)} />
      {viewWorker && <AttendanceModal workerId={viewWorker.id} workerName={viewWorker.name} reportId={report.id} onClose={() => setViewWorker(null)} />}

      {/* --- ASSIGN MODAL --- */}
      {isAssignMode && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-[420px] text-center shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="flex justify-center mb-5">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-full ring-8 ring-blue-50/50"><HiOutlineBriefcase className="w-8 h-8" /></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Assign Maintenance Unit</h3>
            <div className="mb-8 text-left mt-6">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Select Unit</label>
              <div className="relative">
                <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3.5 text-sm bg-gray-50 outline-none appearance-none font-medium">
                  <option value="" disabled>Choose a team...</option>
                  {availableTeams.map((team) => (
                    <option key={team.id} value={team.id}>{team.teamName} ({team.teamId})</option>
                  ))}
                </select>
                <HiChevronDown className="absolute right-4 top-4 text-gray-400" />
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsAssignMode(false)} className="flex-1 py-3.5 text-sm font-bold rounded-xl bg-gray-100 text-gray-600">Cancel</button>
              <button onClick={handleAssignTeam} disabled={!selectedTeam} className="flex-1 py-3.5 text-sm font-bold rounded-xl bg-black text-white shadow-lg disabled:opacity-50">Assign Unit</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DECLINE MODAL */}
      {isDeclineMode && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-[420px] text-center shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="flex justify-center mb-5">
              <div className="p-4 bg-red-50 text-red-600 rounded-full ring-8 ring-red-50/50"><HiOutlineNoSymbol className="w-8 h-8" /></div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Decline Incident Report</h3>
            <p className="text-sm text-gray-500 mb-6 px-4 leading-relaxed">Specify why RDA cannot address this report.</p>
            <div className="mb-8 text-left mt-6 px-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Rejection Reason</label>
              <textarea
                required
                placeholder="E.g., Outside RDA jurisdiction, Duplicate entry..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3.5 text-sm bg-gray-50 outline-none font-medium resize-none h-24 focus:border-red-500"
              />
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setIsDeclineMode(false)} className="flex-1 py-3.5 text-sm font-bold rounded-xl bg-gray-100 text-gray-600">Back</button>
              <button onClick={handleDecline} disabled={!declineReason.trim()} className="flex-1 py-3.5 text-sm font-bold rounded-xl bg-red-600 text-white shadow-lg disabled:opacity-50 transition-all active:scale-95">Decline Report</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="max-w-6xl mx-auto pt-10 px-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <button onClick={() => navigate(-1)} className="group flex items-center gap-2 text-sm text-gray-500 font-medium mb-3 transition-colors hover:text-black">
              <HiOutlineArrowLeft className="w-4 h-4" /> Back to List
            </button>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{report.adminReportId}</h1>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-2 font-medium">
              <HiClock className="w-4 h-4" /> {formatDate(report.createdAtMs)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {report.status === "Submitted" && (
              <>
                <button onClick={() => setIsDeclineMode(true)} className="px-6 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">Decline Issue</button>
                <button onClick={handleApprove} className="px-8 py-3 bg-black text-white rounded-xl text-sm font-bold shadow-xl">Verify & Approve</button>
              </>
            )}
            {report.status === "Pending" && <button onClick={() => { setIsAssignMode(true); fetchMatchingTeams(); }} className="px-8 py-3 bg-black text-white rounded-xl text-sm font-bold shadow-xl">Assign Maintenance Unit</button>}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* ✅ BANNERS DISPLAYED FOR ALL ACTIONS */}
          <div className="space-y-4">
            {report.status === "Submitted" && (
              <Banner color="amber" icon={<HiClock className="w-6 h-6" />} title="Awaiting Validation" sub="Incident is currently under initial administrative review." />
            )}
            {report.status === "Pending" && (
              <Banner color="blue" icon={<HiCheckCircle className="w-6 h-6" />} title="Report Approved" sub="Maintenance unit assignment is required to commence work." />
            )}
            {report.status === "In-progress" && (
              <Banner color="blue" icon={<HiOutlineUsers className="w-6 h-6" />} title="Maintenance Active" sub={`Unit ${report.assignedTeamName} is currently deployed at site.`} />
            )}
            {report.status === "On-Hold" && (
              <Banner color="orange" icon={<HiOutlinePause className="w-6 h-6" />} title="Task Suspended" sub={`Reason: ${report.holdReason || "No details provided."}`} />
            )}
            {report.status === "Resolved" && (
              <Banner color="green" icon={<HiCheckCircle className="w-6 h-6" />} title="Successfully Resolved" sub="Maintenance verified via completion evidence." />
            )}
            {report.status === "Declined" && (
              <Banner color="red" icon={<HiOutlineNoSymbol className="w-6 h-6" />} title="Report Declined" sub={`Reason: ${report.declineReason || "Incident outside scope."}`} />
            )}
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Incident Details</h3>
              <StatusPill status={report.status} />
            </div>
            <div className="p-8">
              <div className="grid grid-cols-2 gap-10 mb-10">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Issue Category</label>
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><HiOutlineTag className="w-4 h-4 text-blue-500" /> {report.category}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Target Deadline</label>
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-2"><HiOutlineCalendar className="w-4 h-4 text-blue-500" /> {report.estimatedDate ? formatDate(report.estimatedDate) : "TBD"}</p>
                </div>
              </div>

              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Description</label>
              <div className="p-5 bg-gray-50 rounded-2xl text-sm leading-relaxed text-gray-600 border border-gray-100 font-medium">{report.description}</div>

              {report.workers && report.workers.length > 0 && (
                <div className="mt-10 pt-8 border-t border-gray-50 animate-fadeIn">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4 flex items-center gap-2"><HiOutlineUsers className="text-blue-500" /> Active Maintenance Crew</label>
                  <div className="flex flex-wrap gap-2">
                    {report.workers.map((workerName: string, i: number) => {
                      const workerId = report.workerIds && report.workerIds[i] ? report.workerIds[i] : null;
                      return (
                        <div
                          key={i}
                          onClick={() => workerId && setViewWorker({ id: workerId, name: workerName })}
                          className={`px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-2 transition-all ${workerId ? 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 cursor-pointer active:scale-95' : ''}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${workerId ? 'bg-blue-500' : 'bg-gray-400'}`} />
                          {workerName}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MOVED PROOF PHOTO OUT OF HERE */}
            </div>
          </div>

          {(report.completionPhoto || report.proofPhoto) && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 mb-6">
              <h3 className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-6 flex items-center gap-2"><HiCheckCircle /> Supervisor Proof of Work</h3>
              <div className="w-full h-64 bg-gray-50 rounded-2xl overflow-hidden cursor-pointer border border-gray-100 group shadow-inner" onClick={() => setImgPreview(report.completionPhoto || report.proofPhoto)}>
                <img src={report.completionPhoto || report.proofPhoto} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Proof" />
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-6"><h3 className="font-bold text-gray-900">Resident Evidence</h3><span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">{report.photos?.length || 0} Total</span></div>
            <div className="grid grid-cols-3 gap-4">
              {report.photos?.map((img: string, i: number) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition" onClick={() => setImgPreview(img)}>
                  <img src={img} className="w-full h-full object-cover" alt="User Evidence" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
            <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2"><HiOutlineMapPin /> Site Location</h3>
            <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
              <p className="text-sm font-bold text-gray-800 leading-relaxed">{report.locationName}</p>
            </div>
            <div className="mt-4 flex items-center justify-between px-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coordinates</span>
              <span className="text-[10px] font-mono text-blue-500">{report.lat?.toFixed(4)}, {report.lng?.toFixed(4)}</span>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Reporter</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center font-black text-lg">{report.fullName.charAt(0)}</div>
              <div><p className="font-bold text-gray-900">{report.fullName}</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resident</p></div>
            </div>
            <div className="space-y-4 border-t border-gray-50 pt-6">
              <div className="flex items-center gap-3 text-sm font-medium text-gray-600"><HiOutlineEnvelope className="text-gray-300" /> {report.email}</div>
              <div className="flex items-center gap-3 text-sm font-medium text-gray-600"><HiOutlineFingerPrint className="text-gray-300" /> {report.nic}</div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><HiClock /> Live Event Log</h3>
            <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {timelineEvents
                .filter(e => e.title !== "New Job Assignment") // ✅ Hide internal worker assignments
                .filter(e => e.title !== "Removed from Job") // ✅ Hide "Removed from Job" (Redundant for Admin)
                .map((event) => {
                  // ✅ TRANSFORM TO ADMIN POV
                  let displayTitle = event.title;
                  let displayMsg = event.message || event.body || "";

                  if (event.title === "New Work Order") {
                    displayTitle = "Maintenance Unit Assigned";
                    displayMsg = "Work order dispatched to the assigned team.";
                  } else if (event.title === "Job Started") {
                    displayTitle = "Field Work Started";
                    displayMsg = "Supervisor has commenced operations on site.";
                  } else if (event.title === "Job On Hold" || event.title === "Job Paused") {
                    displayTitle = "Operations Suspended";
                    displayMsg = displayMsg.replace("Job suspended for:", "Reason:").replace("Job placed on hold:", "Reason:");
                  } else if (event.title === "Job Completed") {
                    displayTitle = "Work Verified & Completed";
                    displayMsg = "Supervisor submitted completion evidence.";
                  } else if (event.title === "Job Resumed" || event.title === "Operations Resumed") {
                    displayTitle = "Operations Resumed";
                    displayMsg = "Work has been restarted.";
                  } else if (event.title === "Report Approved") {
                    displayTitle = "Approved";
                    displayMsg = "Issue validated and queued for assignment.";
                  } else if (event.action === "worker_removed") {
                    displayTitle = "Worker Removed";
                    displayMsg = event.body || "Supervisor updated the team.";
                  } else if (event.action === "worker_added") {
                    displayTitle = "Team Reinforced";
                    displayMsg = event.body || "New members added to the team.";
                  } else if (event.action === "worker_replaced") {
                    displayTitle = "Worker Replaced";
                    displayMsg = event.body || "A worker was replaced on site.";
                  }

                  return (
                    <div key={event.id} className="ml-4 relative border-l border-gray-100 pl-6 pb-8 last:pb-0">
                      <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-4 border-white shadow-sm ${displayTitle.includes("Completed") || displayTitle.includes("Verified") ? "bg-green-500" : displayTitle.includes("Declined") || displayTitle.includes("Suspended") ? "bg-red-500" : "bg-blue-500"}`} />
                      <p className="text-[10px] font-bold text-gray-300 mb-1">{formatDate(event.timestamp)}</p>
                      <p className="text-sm font-bold text-gray-900">{displayTitle}</p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{displayMsg}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
      {popup && <PopupMessage {...popup} onClose={() => setPopup(null)} />}
    </div>
  );
};

// ✅ HELPER: STANDARDIZED ACTION BANNER
const Banner = ({ color, icon, title, sub }: any) => {
  const config: any = {
    amber: "border-amber-200 bg-amber-50/50 text-amber-600",
    blue: "border-blue-200 bg-blue-50/50 text-blue-600",
    orange: "border-orange-200 bg-orange-50/50 text-orange-600",
    green: "border-green-200 bg-green-50/50 text-green-600",
    red: "border-red-200 bg-red-50/50 text-red-600"
  };
  return (
    <div className={`p-5 bg-white border ${config[color].split(' ')[0]} rounded-2xl flex items-start gap-4 shadow-sm animate-fadeIn`}>
      <div className={`p-3 rounded-full ${config[color].split(' ').slice(1).join(' ')}`}>{icon}</div>
      <div>
        <p className="font-bold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{sub}</p>
      </div>
    </div>
  );
};

export default ReportDetails;