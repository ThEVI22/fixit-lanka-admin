import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection, onSnapshot, query, orderBy, doc,
  updateDoc, deleteDoc, getDocs, where, setDoc, getDoc
} from "firebase/firestore";
import {
  HiOutlineMagnifyingGlass, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineEye, HiOutlineXMark, HiOutlinePlus,
  HiOutlineExclamationTriangle, HiOutlineEnvelope, HiOutlinePhone,
  HiOutlineMapPin, HiOutlineUserPlus,
  HiOutlineUsers, HiOutlineLockClosed, HiOutlineBriefcase
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import PopupMessage from "../components/PopupMessage";
import { sendWorkerWelcomeEmail, sendSupervisorWelcomeEmail } from "../services/emailService";

interface StaffMember {
  id: string;
  staffId: string;
  fullName: string;
  email: string; // ✅ Added for validation
  nic: string;
  role: "Supervisor" | "Worker";
  specialization: string;
  status: "Available" | "In-Work" | "Away" | "Sick";
  phone: string;
  address: string;
  dob: string;
  passcode: string;
  currentReportId?: string;
  currentTeamId?: string;
}

const StaffDirectory: React.FC = () => {
  // --- Core States ---
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activeTab, setActiveTab] = useState<"Supervisor" | "Worker">("Supervisor");
  const [searchQuery, setSearchQuery] = useState("");
  // const [loading, setLoading] = useState(true); // Removed as unused
  const [regLoading, setRegLoading] = useState(false);

  // --- Modal States ---
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<StaffMember | null>(null);
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{ member: StaffMember, type: 'status' | 'edit' | 'delete', newStatus?: string, reportId?: string, reportLoc?: string } | null>(null);
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

  // --- Form States ---
  const [formData, setFormData] = useState({
    fullName: "", nic: "", email: "", phone: "", dob: "", address: "",
    role: "Worker" as "Worker" | "Supervisor",
    specialization: "Pothole Maintenance",
  });

  // ✅ Validation State
  const [errors, setErrors] = useState({
    email: "", nic: "", phone: "", fullName: "", dob: ""
  });

  // ✅ Real-time Validation Logic
  const validateField = (name: string, value: string) => {
    let error = "";
    switch (name) {
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Invalid email format.";
        else if (staff.some(m => m.email.toLowerCase() === value.toLowerCase())) error = "Email already registered.";
        break;
      case "nic":
        if (!/^(?:\d{9}[Vv]|\d{12})$/.test(value)) error = "Invalid NIC (9+V or 12 digits).";
        else if (staff.some(m => m.nic.toLowerCase() === value.toLowerCase())) error = "NIC already registered.";
        break;
      case "phone":
        if (!/^(?:0|94|\+94)?7(0|1|2|4|5|6|7|8)\d{7}$/.test(value)) error = "Invalid SL mobile number.";
        break;
      case "fullName":
        if (value.length < 3) error = "Name too short.";
        break;
      case "dob":
        const age = new Date().getFullYear() - new Date(value).getFullYear();
        if (isNaN(age) || age < 18) error = "Must be 18+ years old.";
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [popup, setPopup] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);

  const specializations = ["Pothole Maintenance", "Drainage", "Streetlight", "Signage"];

  const hasChanges = selectedMember ? (
    editName !== selectedMember.fullName ||
    editPhone !== selectedMember.phone ||
    editSpecialization !== selectedMember.specialization
  ) : false;

  useEffect(() => {
    const q = query(collection(db, "staff"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StaffMember[];
      setStaff(staffData);
      // setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const resetRegisterForm = () => {
    setFormData({
      fullName: "", nic: "", email: "", phone: "", dob: "", address: "",
      role: "Worker",
      specialization: "Pothole Maintenance",
    });
    setErrors({ email: "", nic: "", phone: "", fullName: "", dob: "" });
  };

  const validateForm = () => {
    // Final check before submit (in case user skipped fields)
    if (!formData.fullName || errors.fullName) return "Invalid Name.";
    if (!formData.nic || errors.nic) return "Invalid NIC.";
    if (!formData.email || errors.email) return "Invalid Email.";
    if (!formData.phone || errors.phone) return "Invalid Phone.";
    if (!formData.dob || errors.dob) return "Invalid Age.";
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setPopup({ type: "error", title: "Validation Error", message: error });
      return;
    }
    setRegLoading(true);
    try {
      const nicSnap = await getDocs(query(collection(db, "staff"), where("nic", "==", formData.nic)));
      if (!nicSnap.empty) {
        setPopup({ type: "error", title: "Denied", message: "NIC already registered." });
        setRegLoading(false); return;
      }

      const emailSnap = await getDocs(query(collection(db, "staff"), where("email", "==", formData.email)));
      if (!emailSnap.empty) {
        setPopup({ type: "error", title: "Denied", message: "Email already in use." });
        setRegLoading(false); return;
      }

      const prefix = formData.role === "Supervisor" ? "S" : "W";
      const staffId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const passcode = Math.floor(1000 + Math.random() * 9000).toString();

      await setDoc(doc(db, "staff", formData.email), {
        ...formData,
        staffId,
        passcode,
        status: "Available",
        createdAt: Date.now(),
      });

      if (formData.role === "Worker") {
        await sendWorkerWelcomeEmail({ email: formData.email, fullName: formData.fullName, staffId, password: passcode });
      } else {
        await sendSupervisorWelcomeEmail({ email: formData.email, fullName: formData.fullName, staffId });
      }

      setPopup({ type: "success", title: "Registered", message: `${formData.fullName} onboarded.` });
      resetRegisterForm();
      setIsRegisterOpen(false);
    } catch (err) {
      setPopup({ type: "error", title: "Error", message: "Database failure." });
    } finally { setRegLoading(false); }
  };

  const handleOpenEdit = (member: StaffMember) => {
    setSelectedMember(member);
    setEditName(member.fullName);
    setEditPhone(member.phone);
    setEditSpecialization(member.specialization);
    setIsEditOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    // ✅ SMART RESTRICTION: Guided Flow for EDIT
    if (selectedMember.status === "In-Work") {
      let rLoc = await fetchReportContext(selectedMember.currentReportId || "");
      setActionConfirm({ member: selectedMember, type: 'edit', reportId: selectedMember.currentReportId, reportLoc: rLoc });
      return;
    }
    await executeEdit();
  };

  const executeEdit = async () => {
    if (!selectedMember) return;
    try {
      await updateDoc(doc(db, "staff", selectedMember.id), {
        fullName: editName, phone: editPhone, specialization: editSpecialization
      });
      setPopup({ type: "success", title: "Updated", message: "Personnel profile saved." });
      setIsEditOpen(false);
    } catch (err) { setPopup({ type: "error", title: "Error", message: "Update failed." }); }
    setActionConfirm(null);
  };

  const processDeletion = async () => {
    if (!memberToDelete) return;

    // ✅ SMART RESTRICTION: Guided Flow for DELETE
    if (memberToDelete.status === "In-Work") {
      let rLoc = await fetchReportContext(memberToDelete.currentReportId || "");
      setActionConfirm({ member: memberToDelete, type: 'delete', reportId: memberToDelete.currentReportId, reportLoc: rLoc });
      // Close the initial delete confirmation to show the guided one? 
      // Or overlay it? Better to close the first one to avoid stacking.
      setMemberToDelete(null);
      return;
    }
    await executeDelete(memberToDelete);
  };

  const executeDelete = async (member: StaffMember) => {
    try {
      await deleteDoc(doc(db, "staff", member.id));
      setPopup({ type: "success", title: "Removed", message: "Record deleted." });
      setMemberToDelete(null);
    } catch (err) { setPopup({ type: "error", title: "Error", message: "Could not delete profile." }); }
    setActionConfirm(null);
  };

  const updateStatus = async (member: StaffMember, newStatus: string) => {
    // ✅ SMART RESTRICTION: Guided Flow for STATUS
    if (member.status === "In-Work" && newStatus !== "In-Work") {
      let rLoc = await fetchReportContext(member.currentReportId || "");
      setActionConfirm({ member, type: 'status', newStatus, reportId: member.currentReportId, reportLoc: rLoc });
      return;
    }
    await executeStatusUpdate(member, newStatus);
  };

  const executeStatusUpdate = async (member: StaffMember, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };

      // If manually setting to Available, clear any stale assignments
      if (newStatus === "Available") {
        updates.currentTeamId = "";
        updates.currentReportId = "";
      }

      await updateDoc(doc(db, "staff", member.id), updates);
      setPopup({ type: "success", title: "Status Updated", message: "Personnel status synced successfully." });
    } catch (err) { setPopup({ type: "error", title: "Error", message: "Failed to update status." }); }
    setActionConfirm(null);
  };

  const filteredStaff = staff.filter(m =>
    m.role === activeTab && (m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.nic.includes(searchQuery))
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Available": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "In-Work": return "bg-blue-50 text-blue-600 border-blue-100";
      case "Away": return "bg-amber-50 text-amber-600 border-amber-100";
      case "Sick": return "bg-red-50 text-red-600 border-red-100";
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const btnBlack = "bg-black text-white px-8 py-3 rounded-xl font-bold shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2";

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 text-left">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Directory</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Staff Directory</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Monitor and manage RDA workforce availability.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 w-full md:w-80 shadow-sm">
            <HiOutlineMagnifyingGlass className="text-slate-400 text-lg" />
            <input
              type="text"
              placeholder="Search by name or NIC..."
              className="bg-transparent outline-none w-full text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={() => setIsRegisterOpen(true)} className={btnBlack}>
            <HiOutlinePlus size={20} /> Register Staff
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-100">
        {["Supervisor", "Worker"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? "bg-white text-black shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab}s
          </button>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personnel</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credentials</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expertise</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-24 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-slate-50 p-4 rounded-full">
                      <HiOutlineUsers size={32} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">No staff registered</p>
                      <p className="text-xs">Add personnel to populate the directory.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredStaff.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-extrabold text-lg">
                      {member.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{member.fullName}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{member.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5 text-left">
                  <p className="text-sm font-bold text-slate-700">{member.staffId}</p>
                  <p className="text-[10px] font-mono text-slate-400">{member.nic}</p>
                </td>
                <td className="px-8 py-5 text-left">
                  <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-slate-100 text-slate-600 uppercase border border-slate-200">
                    {member.specialization}
                  </span>
                </td>
                <td className="px-8 py-5 text-left">
                  <select
                    className={`text-[10px] font-bold border rounded-full px-3 py-1.5 outline-none cursor-pointer ${getStatusStyle(member.status)}`}
                    value={member.status}
                    onChange={(e) => updateStatus(member, e.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="In-Work" disabled>In-Work</option>
                    <option value="Away">Away</option>
                    <option value="Sick">Sick</option>
                  </select>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setSelectedMember(member); setIsDetailsOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><HiOutlineEye size={20} /></button>
                    <button onClick={() => handleOpenEdit(member)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><HiOutlinePencilSquare size={20} /></button>
                    <button onClick={() => setMemberToDelete(member)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><HiOutlineTrash size={20} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL: REGISTER STAFF --- */}
      {isRegisterOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh] relative [&::-webkit-scrollbar]:hidden">
            <button onClick={() => { setIsRegisterOpen(false); resetRegisterForm(); }} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-black">
              <HiOutlineXMark size={24} />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-black p-4 rounded-3xl text-white shadow-xl shadow-black/20"><HiOutlineUserPlus size={28} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registration</p>
                <h1 className="text-3xl font-bold text-gray-900 mt-1">Personnel Onboarding</h1>
                <p className="text-sm text-gray-500 mt-1 font-medium">Add new members to the workforce directory and assign roles.</p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input required name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} className={`w-full bg-slate-50 border ${errors.fullName ? 'border-red-500 focus:border-red-600' : 'border-slate-200 focus:border-black'} rounded-2xl px-5 py-4 outline-none transition-all`} />
                {errors.fullName && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">NIC Number</label>
                <input required name="nic" placeholder="NIC" value={formData.nic} onChange={handleChange} className={`w-full bg-slate-50 border ${errors.nic ? 'border-red-500 focus:border-red-600' : 'border-slate-200 focus:border-black'} rounded-2xl px-5 py-4 outline-none transition-all`} />
                {errors.nic && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.nic}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date of Birth</label>
                <input type="date" name="dob" required value={formData.dob} onChange={handleChange} className={`w-full bg-slate-50 border ${errors.dob ? 'border-red-500 focus:border-red-600' : 'border-slate-200 focus:border-black'} rounded-2xl px-5 py-4 outline-none transition-all`} />
                {errors.dob && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.dob}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
                <input type="email" name="email" required placeholder="Email" value={formData.email} onChange={handleChange} className={`w-full bg-slate-50 border ${errors.email ? 'border-red-500 focus:border-red-600' : 'border-slate-200 focus:border-black'} rounded-2xl px-5 py-4 outline-none transition-all`} />
                {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Phone</label>
                <input required name="phone" placeholder="07XXXXXXXX" value={formData.phone} onChange={handleChange} className={`w-full bg-slate-50 border ${errors.phone ? 'border-red-500 focus:border-red-600' : 'border-slate-200 focus:border-black'} rounded-2xl px-5 py-4 outline-none transition-all`} />
                {errors.phone && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.phone}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Address</label>
                <textarea required name="address" rows={2} placeholder="Residential Address" value={formData.address} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-black resize-none" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-black cursor-pointer">
                  <option value="Worker">Worker</option>
                  <option value="Supervisor">Supervisor</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Expertise</label>
                <select value={formData.specialization} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:border-black cursor-pointer">
                  {specializations.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-4 pt-4">
                <button type="button" onClick={() => setIsRegisterOpen(false)} className="py-4 font-bold text-slate-400">Cancel</button>
                <button type="submit" disabled={regLoading || Object.values(errors).some(e => e)} className={`disabled:opacity-50 disabled:cursor-not-allowed ${btnBlack}`}>
                  {regLoading ? "Onboarding..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: VIEW DETAILS (Role-Based Fix) --- */}
      {isDetailsOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 text-left">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter border border-blue-100 mb-2 inline-block">Staff Profile</span>
                <h2 className="text-2xl font-bold text-slate-900">{selectedMember.fullName}</h2>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-black">
                <HiOutlineXMark size={24} />
              </button>
            </div>
            <div className="space-y-5">
              {/* ✅ CREDENTIAL CARDS SECTION (Conditional Passcode Rendering) */}
              <div className={`grid ${selectedMember.role === "Worker" ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Staff ID</p>
                  <p className="text-sm font-bold text-slate-900">{selectedMember.staffId}</p>
                </div>
                {/* ✅ ONLY SHOW PASSCODE FOR WORKERS */}
                {selectedMember.role === "Worker" && (
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1 flex items-center gap-1.5"><HiOutlineLockClosed /> Login Passcode</p>
                    <p className="text-sm font-bold text-blue-600 tracking-widest">{selectedMember.passcode || "N/A"}</p>
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">National IC</p>
                <p className="text-sm font-bold text-slate-900">{selectedMember.nic}</p>
              </div>
              <div className="space-y-3 px-1">
                <div className="flex items-center gap-4 text-slate-600"><HiOutlineEnvelope className="text-slate-400" /><p className="text-sm font-medium">{selectedMember.id}</p></div>
                <div className="flex items-center gap-4 text-slate-600"><HiOutlinePhone className="text-slate-400" /><p className="text-sm font-medium">{selectedMember.phone}</p></div>
                <div className="flex items-start gap-4 text-slate-600"><HiOutlineMapPin className="text-slate-400 mt-1" /><p className="text-sm font-medium leading-relaxed">{selectedMember.address}</p></div>
              </div>
            </div>
            <button onClick={() => setIsDetailsOpen(false)} className={`w-full mt-10 py-4 ${btnBlack}`}>Dismiss Details</button>
          </div>
        </div>
      )}

      {/* --- OTHER MODALS --- */}
      {isEditOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl">
            <h2 className="text-2xl font-bold mb-8">Edit Profile</h2>
            <form onSubmit={handleUpdateMember} className="space-y-6">
              <input required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none" placeholder="Name" />
              <input required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none" placeholder="Phone" />
              <select value={editSpecialization} onChange={(e) => setEditSpecialization(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none">
                {specializations.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-4 pt-6">
                <button type="button" onClick={() => setIsEditOpen(false)} className="py-4 font-bold text-slate-400">Cancel</button>
                <button type="submit" disabled={!hasChanges} className={btnBlack}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {memberToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl text-center">
            <HiOutlineExclamationTriangle size={32} className="mx-auto mb-8 text-slate-900" />
            <h3 className="text-2xl font-bold mb-2">Remove Staff?</h3>
            <p className="text-slate-500 text-sm mb-10 font-medium">Permanently remove <b className="text-slate-900">{memberToDelete.fullName}</b>?</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setMemberToDelete(null)} className="py-4 font-bold text-slate-400">Stay</button>
              <button onClick={processDeletion} className="py-4 bg-black text-white font-bold rounded-2xl">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ STATUS CHANGE CONFIRMATION (GUIDED - UNIFIED) */}
      {actionConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500">
              <HiOutlineBriefcase size={28} />
            </div>
            <h3 className="text-xl font-bold mb-2">Active Assignment</h3>
            <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed">
              <b className="text-slate-900">{actionConfirm.member.fullName}</b>
              {actionConfirm.member.role === "Supervisor"
                ? " is currently leading an active team."
                : " is currently deployed in a team."
              }
              <br />
              {actionConfirm.type === 'delete' && <span className="text-red-500 font-bold block mt-1">Deletion will Force Release them.</span>}
              {actionConfirm.type === 'edit' && <span className="text-amber-600 font-bold block mt-1">Edits may confuse active operations.</span>}
              {actionConfirm.type === 'status' && <span className="text-slate-500 block mt-1">Change status must check active job first.</span>}

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
                  if (actionConfirm.type === 'status' && actionConfirm.newStatus) executeStatusUpdate(actionConfirm.member, actionConfirm.newStatus);
                  if (actionConfirm.type === 'edit') executeEdit();
                  if (actionConfirm.type === 'delete') executeDelete(actionConfirm.member);
                }}
                className="block w-full text-xs font-bold text-red-500 py-2 hover:underline"
              >
                Advanced: Force {actionConfirm.type === 'delete' ? 'Delete' : actionConfirm.type === 'edit' ? 'Save' : 'Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {popup && <PopupMessage {...popup} onClose={() => setPopup(null)} />}
    </div>
  );
};

export default StaffDirectory;