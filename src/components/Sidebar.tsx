import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiFileText,
  FiUsers,
  FiList,
  FiLogOut
} from "react-icons/fi";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import LogoutModal from "../components/LogoutModal";

const Sidebar = () => {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    [
      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
      isActive
        ? "bg-black text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100",
    ].join(" ");

  const handleConfirmLogout = async () => {
    await signOut(auth);
    setShowLogout(false);
    navigate("/login");
  };

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-100 min-h-screen flex flex-col">

        {/* Brand */}
        <div className="h-16 flex items-center px-6 -mt-px border-b border-slate-50/50">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Fixit Lanka
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-6 space-y-2">
          <NavLink to="/" className={linkClasses} end>
            <FiHome size={18} />
            <span>Overview</span>
          </NavLink>

          <NavLink to="/reports" className={linkClasses}>
            <FiFileText size={18} />
            <span>Reports</span>
          </NavLink>

          <NavLink to="/teams" className={linkClasses}>
            <FiUsers size={18} />
            <span>Teams</span>
          </NavLink>

          {/* Unified Staff Directory link without section label */}
          <NavLink to="/staff-directory" className={linkClasses}>
            <FiList size={18} />
            <span>Staff Directory</span>
          </NavLink>



          {/* Logout Button */}
          <button
            onClick={() => setShowLogout(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full mt-auto mb-6"
          >
            <FiLogOut size={18} />
            <span>Logout</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 text-xs text-slate-400 border-t border-slate-50">
          © {new Date().getFullYear()} Fixit Lanka
        </div>
      </aside>

      {/* Logout Popup */}
      <LogoutModal
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
};

export default Sidebar;