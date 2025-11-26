// ------------------------------------------------------
// ReportDetails.tsx — Final (Uniform Black & White Button Styles)
// ------------------------------------------------------
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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
  HiOutlineTag
} from "react-icons/hi2";

/* ---------------------------------------------------
    1. STATUS CONFIGURATION
--------------------------------------------------- */
const statusColor: Record<string, string> = {
  Submitted: "bg-amber-100 text-amber-700 border border-amber-200",
  Pending: "bg-amber-100 text-amber-700 border border-amber-200",
  Declined: "bg-red-100 text-red-700 border border-red-200",
};

// Status Pill Component
const StatusPill = ({ status }: { status: string }) => (
  <span
    className={`inline-flex items-center justify-center
                min-w-[90px] h-[28px] px-3 
                rounded-full text-[11px] font-medium
                ${statusColor[status] || "bg-gray-50 text-gray-600 border border-gray-200"}`}
  >
    {status === "Submitted"
      ? "Pending Approval"
      : status === "Pending"
      ? "Pending Assignment"
      : status}
  </span>
);

/* ---------------------------------------------------
    2. IMAGE PREVIEW MODAL
--------------------------------------------------- */
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

/* ---------------------------------------------------
    3. MAIN COMPONENT
--------------------------------------------------- */
const ReportDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState<any>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  // Decline Logic State
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclineMode, setIsDeclineMode] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      const ref = doc(db, "all_reports", id!);
      const snap = await getDoc(ref);
      setReport({ id, ...snap.data() });
    };
    fetchReport();
  }, [id]);

  // --- ACTION HANDLERS ---

  // 1. Approve Function
  const handleApprove = async () => {
    await updateDoc(doc(db, "all_reports", id!), { status: "Pending" });
    setReport((prev: any) => ({ ...prev, status: "Pending" }));
  };

  // 2. Decline Function
  const handleDecline = async () => {
    if (!declineReason.trim()) return;
    await updateDoc(doc(db, "all_reports", id!), {
      status: "Declined",
      declineReason,
    });
    setReport((prev: any) => ({
      ...prev,
      status: "Declined",
      declineReason,
    }));
    setIsDeclineMode(false); // Close modal
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-gray-900 selection:bg-gray-200">
      
      {/* IMAGE PREVIEW OVERLAY */}
      <ImageModal img={imgPreview} onClose={() => setImgPreview(null)} />

      {/* --- DECLINE POPUP MODAL --- */}
      {isDeclineMode && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-[480px] text-center shadow-2xl border border-gray-100 transform transition-all scale-100 animate-fadeIn">
            
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-red-50 text-red-600 rounded-full ring-8 ring-red-50/50">
                <HiOutlineExclamationCircle className="w-8 h-8" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Confirm Report Decline
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed px-4">
              You are about to permanently decline report{" "}
              <span className="font-semibold text-gray-900">
                {report.adminReportId}
              </span>
              . This action cannot be reversed.
            </p>

            {/* Reason Text Area */}
            <div className="mb-6 text-left">
              <label className="block text-xs font-semibold text-gray-700 mb-2 ml-1 uppercase tracking-wider">
                Reason for Rejection
              </label>
              <textarea
                id="decline-reason"
                placeholder="e.g. Duplicate report, Insufficient evidence..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 h-32 
                           focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all 
                           placeholder-gray-400 resize-none shadow-sm"
              />
            </div>

            {/* Modal Actions - UPDATED BUTTON STYLES */}
            <div className="flex justify-center gap-3">
              {/* Cancel Button - White Style */}
              <button
                onClick={() => setIsDeclineMode(false)}
                className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 
                           hover:bg-gray-50 transition-all font-semibold shadow-sm"
              >
                Cancel
              </button>
              {/* Confirm Decline Button - Black Style */}
              <button
                onClick={handleDecline}
                disabled={!declineReason.trim()}
                className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-black text-white shadow-md
                           hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER SECTION --- */}
      <div className="max-w-6xl mx-auto pt-10 px-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          
          {/* Left: Title & Back */}
          <div>
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 font-medium mb-3 transition-colors"
            >
              <div className="p-1 rounded-full group-hover:bg-gray-200 transition-colors">
                <HiOutlineArrowLeft className="w-4 h-4" />
              </div>
              Back to reports
            </button>
            
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-semibold text-gray-900">
                {report.adminReportId}
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
              <HiClock className="w-4 h-4 text-gray-400" />
              Created on{" "}
              {new Date(report.createdAtMs).toLocaleString("en-GB", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* Right: Actions (Black & White Buttons) - UPDATED STYLES */}
          <div className="flex items-center gap-3 mt-2">
            {/* ONLY SHOW BUTTONS IF STATUS IS "Submitted" */}
            {report.status === "Submitted" && (
              <>
                {/* Decline Button (White Style) */}
                <button
                  onClick={() => setIsDeclineMode(true)}
                  className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 
                             shadow-sm hover:bg-gray-50 transition-all"
                >
                  Decline
                </button>
                
                {/* Approve Button (Black Style) */}
                <button
                  onClick={handleApprove}
                  className="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold 
                             shadow-md hover:bg-gray-800 transition-all transform active:scale-95"
                >
                  Approve Report
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === LEFT COLUMN (MAIN) === */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CARD 1: Report Details */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white">
              <h3 className="font-semibold text-gray-900 text-lg">Report Details</h3>
              <StatusPill status={report.status} />
            </div>
            <div className="p-6">
              <div className="mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Issue Category
                </span>
                <p className="text-base font-semibold text-gray-900 mt-1 flex items-center gap-2">
                   <HiOutlineTag className="w-4 h-4 text-gray-400"/> 
                   {report.category}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Description
                </span>
                <div className="mt-2 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-600 leading-relaxed">
                  {report.description}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Evidence Gallery */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 text-lg">Evidence Gallery</h3>
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                {report.photos?.length || 0} Images
              </span>
            </div>

            <div className="p-6">
              {report.photos && report.photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {report.photos.map((img: string, index: number) => (
                    <div
                      key={index}
                      className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer border border-gray-200"
                      onClick={() => setImgPreview(img)}
                    >
                      <img
                        src={img}
                        alt={`Evidence ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                         <HiPhoto className="text-white opacity-0 group-hover:opacity-100 w-8 h-8 drop-shadow-md transition-opacity duration-300"/>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                  <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                    <HiPhoto className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">No evidence attached</p>
                </div>
              )}
            </div>
          </div>

          {/* STATUS BANNERS */}
          <div className="transition-all duration-500 ease-in-out">
            {report.status === "Declined" && (
              <div className="p-5 bg-red-50 border border-red-100 rounded-2xl text-red-900 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-white rounded-full text-red-600 shadow-sm ring-1 ring-red-100 flex-shrink-0">
                  <HiXMark className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-base">Declined by Administrator</p>
                  <p className="mt-1 text-sm text-red-700 leading-relaxed">
                    Reason: {report.declineReason || "No reason provided."}
                  </p>
                </div>
              </div>
            )}

            {report.status === "Pending" && (
              <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl text-amber-900 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-white rounded-full text-amber-600 shadow-sm ring-1 ring-amber-100 flex-shrink-0">
                  <HiCheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-base">Approved / Pending Assignment</p>
                  <p className="mt-1 text-sm text-amber-700 leading-relaxed">
                    This report has been approved and is currently in the queue for work team assignment.
                  </p>
                </div>
              </div>
            )}

            {report.status === "Submitted" && (
              <div className="p-5 bg-white border border-amber-100 rounded-2xl text-gray-900 flex items-start gap-4 shadow-[0_2px_8px_rgba(251,191,36,0.1)]">
                <div className="p-2 bg-amber-50 rounded-full text-amber-600 shadow-sm ring-1 ring-amber-100 flex-shrink-0">
                  <HiClock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-base">Awaiting Review</p>
                  <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                    This report has been submitted by the user and is waiting for administrative action.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === RIGHT COLUMN (SIDEBAR) === */}
        <div className="space-y-6">
          
          {/* CARD 3: User Details */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6 border-b border-gray-50 pb-3">
              Reporter Details
            </h3>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 ring-4 ring-blue-50/50">
                <HiOutlineUserCircle className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {report.fullName}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mt-1">
                  Resident
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="group">
                <label className="text-xs font-medium text-gray-400 uppercase block mb-1">Email Address</label>
                <div className="flex items-center gap-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  <div className="p-1.5 bg-gray-50 rounded-md text-gray-400 group-hover:text-blue-500 transition-colors">
                     <HiOutlineEnvelope className="w-4 h-4" />
                  </div>
                  <a
                    href={`mailto:${report.email}`}
                    className="hover:underline decoration-blue-300 underline-offset-4"
                  >
                    {report.email}
                  </a>
                </div>
              </div>

              <div className="group">
                <label className="text-xs font-medium text-gray-400 uppercase block mb-1">National ID (NIC)</label>
                <div className="flex items-center gap-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  <div className="p-1.5 bg-gray-50 rounded-md text-gray-400 group-hover:text-purple-500 transition-colors">
                    <HiOutlineFingerPrint className="w-4 h-4" />
                  </div>
                  <span className="font-mono tracking-wide">{report.nic}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: Location */}
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
               <HiOutlineMapPin className="text-gray-400 w-5 h-5"/>
               <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                 Location
               </h3>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed pl-1">
              {report.locationName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetails;