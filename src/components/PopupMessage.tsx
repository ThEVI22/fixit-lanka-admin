import React from "react";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiInfo,
  FiXCircle,
} from "react-icons/fi";

interface PopupMessageProps {
  type?: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onClose: () => void;
}

const PopupMessage: React.FC<PopupMessageProps> = ({
  type = "info",
  title,
  message,
  onClose,
}) => {
  // Select icon + colors based on type
  const config = {
    success: {
      icon: <FiCheckCircle size={32} className="text-green-500" />,
    },
    error: {
      icon: <FiXCircle size={32} className="text-red-500" />,
    },
    warning: {
      icon: <FiAlertTriangle size={32} className="text-yellow-500" />,
    },
    info: {
      icon: <FiInfo size={32} className="text-blue-500" />,
    },
  }[type];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 animate-fadeIn">
      <div className="bg-white w-[90%] max-w-md rounded-2xl shadow-xl p-6 animate-scaleIn">

        {/* ICON */}
        <div className="flex justify-center mb-3">
          {config.icon}
        </div>

        {/* TITLE */}
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          {title}
        </h2>

        {/* MESSAGE */}
        <p className="text-sm text-gray-600 text-center leading-relaxed mb-6">
          {message}
        </p>

        {/* FOOTER BUTTON */}
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-black text-white text-sm font-medium shadow hover:opacity-90 transition"
          >
            OK
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes scaleIn {
          from { transform: scale(0.85); opacity: 0 }
          to { transform: scale(1); opacity: 1 }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out }
        .animate-scaleIn { animation: scaleIn 0.25s ease-out }
      `}</style>
    </div>
  );
};

export default PopupMessage;
