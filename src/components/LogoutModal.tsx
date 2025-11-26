import React from "react";
import { FiLogOut } from "react-icons/fi";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<Props> = ({ open, onClose, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fadeIn">
      
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm px-8 py-8 animate-scaleIn"
        style={{
          animation: "scaleIn 0.25s ease-out",
        }}
      >
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center shadow-sm">
          <FiLogOut size={30} className="text-black" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-center text-slate-900">
          Log out from Fixit Lanka?
        </h2>

        {/* Subtext */}
        <p className="text-center text-slate-500 mt-2 mb-7 text-sm leading-relaxed">
          You will be taken back to the login screen.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition active:scale-[0.97]"
          >
            Stay
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-black text-white font-semibold hover:opacity-90 transition active:scale-[0.97]"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0 }
            to { opacity: 1 }
          }

          @keyframes scaleIn {
            0% { opacity: 0; transform: scale(0.9); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

export default LogoutModal;
