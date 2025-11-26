import React, { useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// --------------------------------------------------
// TYPES
// --------------------------------------------------
interface Report {
  id: string;
  createdAtMs: number;
  category: string;
  locationName: string;
  [key: string]: any;
}

// --------------------------------------------------
// CONFIG FOR NOTIFICATION
// --------------------------------------------------
const AUTO_EXPIRE_MINUTES = 60; // ⬅ increased (was 10)
const MAX_NOTIFICATIONS = 3;
const AUTO_DISMISS_MS = 25000; // ⬅ increased (was 20 sec)

// LS helpers
const getLS = (key: string, fallback = 0) =>
  Number(localStorage.getItem(key) || fallback);

const setLS = (key: string, val: number) =>
  localStorage.setItem(key, String(val));

const Topbar: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState("RDA Officer");

  const [reports, setReports] = useState<Report[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const lastSeenTs = getLS("last_seen_timestamp");
  const lastClearedTs = getLS("last_cleared_timestamp");
  const lastExpiredTs = getLS("last_expired_timestamp"); // NEW persistent auto-expire

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
  // REALTIME FIRESTORE LISTENER
  // --------------------------------------------------
  useEffect(() => {
    const q = query(
      collection(db, "all_reports"),
      orderBy("createdAtMs", "desc"),
      limit(15)
    );

    const unsub = onSnapshot(q, (snap) => {
      const nowMs = Date.now();

      let list: Report[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Report[];

      // FILTER 1 — Clear notifications
      list = list.filter((r) => r.createdAtMs > lastClearedTs);

      // FILTER 2 — Expired (persistent)
      list = list.filter((r) => r.createdAtMs > lastExpiredTs);

      // FILTER 3 — Auto-expire (time-based)
      const expireCutoff = nowMs - AUTO_EXPIRE_MINUTES * 60000;
      list = list.filter((r) => r.createdAtMs > expireCutoff);

      // LIMIT
      list = list.slice(0, MAX_NOTIFICATIONS);

      setReports(list);
    });

    return () => unsub();
  }, [lastClearedTs, lastExpiredTs]);

  // --------------------------------------------------
  // AUTO DISMISS (removes visual + persists)
  // --------------------------------------------------
  useEffect(() => {
    if (!reports.length) return;

    const timer = setTimeout(() => {
      const removed = reports[0]; // oldest message
      const cutoff = removed.createdAtMs;

      // SAVE PERSISTENT EXPIRATION
      setLS("last_expired_timestamp", cutoff);

      // VISUAL REMOVE
      setReports((prev) => prev.slice(1));
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [reports]);

  // --------------------------------------------------
  // UNSEEN DOT
  // --------------------------------------------------
  const unseen = reports.filter((r) => r.createdAtMs > lastSeenTs);

  const togglePanel = () => {
    const next = !showPanel;
    setShowPanel(next);

    if (next && reports.length > 0) {
      const newest = reports[0].createdAtMs;
      setLS("last_seen_timestamp", newest);
    }
  };

  // --------------------------------------------------
  // CLEAR NOTIFICATIONS (PERSISTENT)
  // --------------------------------------------------
  const clearNotifications = () => {
    const now = Date.now();
    setLS("last_seen_timestamp", now);
    setLS("last_cleared_timestamp", now);
    setReports([]);
  };

  // --------------------------------------------------
  // CLICK OUTSIDE TO CLOSE POPUP
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

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <header className="bg-white/70 backdrop-blur border-b border-gray-100 relative">
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
          {/* BELL */}
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
              className="w-9 h-9 rounded-full border shadow"
            />
          </div>
        </div>
      </div>

      {/* PANEL */}
      {showPanel && (
        <div
          ref={panelRef}
          className="absolute right-6 top-16 bg-white shadow-2xl rounded-2xl border border-gray-100 w-96 p-5 z-50 animate-slideDown"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">
              Incoming Reports
            </h3>

            {reports.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {reports.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">
              No notifications.
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50 shadow hover:bg-white transition animate-fadeIn"
                >
                  <p className="text-sm font-semibold">{r.category}</p>
                  <p className="text-xs text-gray-500">{r.locationName}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(r.createdAtMs).toLocaleString("en-GB")}
                  </p>
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
