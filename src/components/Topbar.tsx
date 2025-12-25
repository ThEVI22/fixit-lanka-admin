import React, { useEffect, useRef, useState } from "react";
import { FiBell, FiInfo, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// --------------------------------------------------
// TYPES (Unified Notification Type)
// --------------------------------------------------
interface NotificationItem {
  id: string;
  type: "new_report" | "worker_update";
  title: string;
  message: string;
  timestamp: number;
  reportId?: string;
}

// --------------------------------------------------
// CONFIG
// --------------------------------------------------
const AUTO_EXPIRE_MINUTES = 60;
const MAX_NOTIFICATIONS = 5; 
const AUTO_DISMISS_MS = 25000;

// LS helpers
const getLS = (key: string, fallback = 0) =>
  Number(localStorage.getItem(key) || fallback);

const setLS = (key: string, val: number) =>
  localStorage.setItem(key, String(val));

const Topbar: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState("RDA Officer");

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const lastSeenTs = getLS("last_seen_timestamp");
  const lastClearedTs = getLS("last_cleared_timestamp");
  const lastExpiredTs = getLS("last_expired_timestamp");

  // --------------------------------------------------
  // CLOCK
  // --------------------------------------------------
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const formattedDate = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // --------------------------------------------------
  // ADMIN DATA
  // --------------------------------------------------
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const adminRef = doc(db, "admins", user.email || "");
    getDoc(adminRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminName(data.name || "Admin");
        setAdminRole(data.role || "RDA Officer");
      }
    });
  }, []);

  // --------------------------------------------------
  // DUAL REALTIME LISTENER
  // --------------------------------------------------
  useEffect(() => {
    const qReports = query(
      collection(db, "all_reports"),
      orderBy("createdAtMs", "desc"),
      limit(10)
    );

    const qWorker = query(
      collection(db, "notifications"),
      orderBy("timestamp", "desc"),
      limit(10)
    );

    let reportData: NotificationItem[] = [];
    let workerData: NotificationItem[] = [];

    const mergeAndSet = () => {
      let combined = [...reportData, ...workerData];
      combined.sort((a, b) => b.timestamp - a.timestamp);

      combined = combined.filter((r) => r.timestamp > lastClearedTs);
      combined = combined.filter((r) => r.timestamp > lastExpiredTs);

      const nowMs = Date.now();
      const expireCutoff = nowMs - AUTO_EXPIRE_MINUTES * 60000;
      combined = combined.filter((r) => r.timestamp > expireCutoff);

      combined = combined.slice(0, MAX_NOTIFICATIONS);
      setNotifications(combined);
    };

    const unsubReports = onSnapshot(qReports, (snap) => {
      reportData = snap.docs.map((d) => ({
        id: d.id,
        type: "new_report",
        title: d.data().category || "New Report",
        message: d.data().locationName || "Unknown Location",
        timestamp: d.data().createdAtMs || Date.now(),
        reportId: d.id,
      })) as NotificationItem[];
      mergeAndSet();
    });

    const unsubWorker = onSnapshot(qWorker, (snap) => {
      workerData = snap.docs
        // ✅ STRICT FIX: Only allow "worker_update". 
        // This blocks "admin_update" and any old data without a type.
        .filter((d) => d.data().type === 'worker_update') 
        .map((d) => {
          const data = d.data();
          const ts = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now();
          return {
            id: d.id,
            type: "worker_update",
            title: data.title || "Update",
            message: data.message || "Worker update received",
            timestamp: ts,
            reportId: data.reportId,
          };
        }) as NotificationItem[];
      mergeAndSet();
    });

    return () => {
      unsubReports();
      unsubWorker();
    };
  }, [lastClearedTs, lastExpiredTs]);

  // --------------------------------------------------
  // AUTO DISMISS
  // --------------------------------------------------
  useEffect(() => {
    if (notifications.length === 0) return;

    const timer = setTimeout(() => {
      setNotifications((prev) => {
        if (prev.length === 0) return [];
        const justRemoved = prev[0];
        const remaining = prev.slice(1);
        setLS("last_expired_timestamp", justRemoved.timestamp);
        return remaining;
      });
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [notifications]);

  const unseen = notifications.filter((r) => r.timestamp > lastSeenTs);

  const togglePanel = () => {
    const next = !showPanel;
    setShowPanel(next);
    if (next && notifications.length > 0) {
      const newest = notifications[0].timestamp;
      setLS("last_seen_timestamp", newest);
    }
  };

  const clearNotifications = () => {
    const now = Date.now();
    setLS("last_seen_timestamp", now);
    setLS("last_cleared_timestamp", now);
    setNotifications([]);
  };

  // --------------------------------------------------
  // CLICK OUTSIDE
  // --------------------------------------------------
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("#notificationBell")
      ) {
        setShowPanel(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const getIcon = (item: NotificationItem) => {
    if (item.type === "new_report") return null; 
    
    if (item.title.includes("Started")) return <FiCheckCircle className="text-blue-500 mt-1" size={14} />;
    if (item.title.includes("Completed")) return <FiCheckCircle className="text-green-500 mt-1" size={14} />;
    if (item.title.includes("On-Hold") || item.title.includes("Paused")) return <FiAlertCircle className="text-orange-500 mt-1" size={14} />;
    
    return <FiInfo className="text-gray-500 mt-1" size={14} />;
  };

  return (
    <header className="bg-white/70 backdrop-blur border-b border-gray-100 relative z-50">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        {/* LEFT */}
        <div>
          <h2 className="text-sm md:text-base font-semibold text-gray-900">
            Welcome back, {adminName}! 👋
          </h2>
          <p className="text-[11px] text-gray-400">
            {formattedDate} • {formattedTime} • Fixit Lanka Admin Panel
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          <button
            id="notificationBell"
            onClick={togglePanel}
            className="relative rounded-full w-10 h-10 bg-white border border-gray-200 flex items-center justify-center text-gray-700 shadow hover:bg-gray-50 transition"
          >
            <FiBell size={18} />
            {unseen.length > 0 && (
              <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-red-500 shadow animate-pulse" />
            )}
          </button>

          <div className="h-8 w-px bg-gray-200" />

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">{adminName}</p>
              <p className="text-[11px] text-gray-400">{adminRole}</p>
            </div>
            <img
              src="https://i.pravatar.cc/40"
              alt="Admin"
              className="w-9 h-9 rounded-full border shadow"
            />
          </div>
        </div>
      </div>

      {/* PANEL */}
      {showPanel && (
        <div
          ref={panelRef}
          className="absolute right-6 top-16 bg-white shadow-2xl rounded-2xl border border-gray-100 w-96 p-5 animate-slideDown"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">
              Notifications
            </h3>

            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              No new updates.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border border-gray-200 shadow-sm transition animate-fadeIn flex gap-3 
                    ${item.type === 'worker_update' ? 'bg-blue-50/50 hover:bg-blue-50' : 'bg-gray-50 hover:bg-white'}
                  `}
                >
                  {getIcon(item)}

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm font-semibold ${item.type === 'worker_update' ? 'text-gray-900' : 'text-gray-800'}`}>
                        {item.title}
                      </p>
                      {item.type === 'new_report' && (
                         <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-600">NEW</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2 text-right">
                      {new Date(item.timestamp).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Topbar;