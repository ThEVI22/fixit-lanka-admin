import React, { useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import {
  HiOutlineClipboardList,
  HiOutlineCheckCircle,
  HiOutlineBell,
  HiOutlineChatAlt2,
  HiOutlineXCircle
} from "react-icons/hi";
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

interface NotificationItem {
  id: string;
  type: "new_report" | "worker_update" | "admin_alert";
  title: string;
  message: string;
  timestamp: number;
  reportId?: string;
  action?: string; // start, hold, resume, complete
}

const AUTO_EXPIRE_MINUTES = 60 * 24; // Keep for 24 hours
const MAX_NOTIFICATIONS = 20;
const setLS = (key: string, val: number) => localStorage.setItem(key, String(val));
const getLS = (key: string, fallback = 0) => Number(localStorage.getItem(key) || fallback);

const formatTimeAgo = (ts: number) => {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString("en-GB");
};

// Helper to format messages professionally for Admin
const formatMessage = (data: any) => {
  let msg = data.body || data.message || "";

  // Transform "Supervisor verified Sick Report from [Name]" -> "[Name]'s Sick Report has been verified."
  if (data.title?.includes("Verified") && msg.includes("from")) {
    const name = msg.split("from")[1]?.trim().split(".")[0] || "Worker";
    const type = msg.includes("Sick") ? "Sick Report" : "Site Issue";
    return `${type} from ${name} has been verified on-site.`;
  }
  // Transform "Supervisor declined Sick Report from [Name]" -> "[Name]'s Sick Report has been declined."
  if (data.title?.includes("Declined") && msg.includes("from")) {
    const name = msg.split("from")[1]?.trim().split(".")[0] || "Worker";
    const type = msg.includes("Sick") ? "Sick Report" : "Site Issue";
    return `${type} from ${name} has been declined.`;
  }
  return msg;
};

const Topbar: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const lastSeenTs = getLS("last_seen_timestamp");
  const lastClearedTs = getLS("last_cleared_timestamp");

  // ✅ 1. LIVE CLOCK (Updated to every second)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 2. FETCH ADMIN DATA
  useEffect(() => {
    const fetchAdminData = async () => {
      const user = auth.currentUser;
      if (!user?.email) return;
      try {
        const adminRef = doc(db, "admins", user.email);
        const snap = await getDoc(adminRef);
        if (snap.exists()) {
          const data = snap.data();
          setAdminName(data.name || "Admin");
          setAdminRole(data.role || "RDA Officer");
        }
      } catch (error) { console.error(error); }
    };
    fetchAdminData();
  }, []);

  // 3. REAL-TIME NOTIFICATIONS
  useEffect(() => {
    const qReports = query(collection(db, "all_reports"), orderBy("createdAtMs", "desc"), limit(5));
    // Fetch generic notifications (admin_alert OR worker_update)
    const qNotifications = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(20));

    let reportData: NotificationItem[] = [];
    let notifData: NotificationItem[] = [];

    const mergeAndSet = () => {
      let combined = [...reportData, ...notifData];
      combined.sort((a, b) => b.timestamp - a.timestamp);
      // Filter out cleared locally
      combined = combined.filter((r) => r.timestamp > lastClearedTs);

      // We can relax the expiration filter if needed, but AUTO_EXPIRE_MINUTES is now 24h
      const expireCutoff = Date.now() - AUTO_EXPIRE_MINUTES * 60000;
      setNotifications(combined.filter((r) => r.timestamp > expireCutoff).slice(0, MAX_NOTIFICATIONS));
    };

    const unsubReports = onSnapshot(qReports, (snap) => {
      reportData = snap.docs.map((d) => ({
        id: d.id, type: "new_report",
        title: `New ${d.data().category}`,
        message: d.data().locationName || "Location pending",
        timestamp: d.data().createdAtMs || Date.now(),
        reportId: d.id,
      }));
      mergeAndSet();
    });

    const unsubNotifs = onSnapshot(qNotifications, (snap) => {
      notifData = snap.docs
        .map((d) => d.data())
        .filter((data) => {
          // Explicitly show 'admin_alert', 'worker_update' (if broadcast), or anything targeted at 'admin'
          // AND exclude "New Report" types from this stream to avoid duplicates (since we fetch reports separately)
          const isNewReport = data.title?.startsWith("New Report");
          return (data.target === 'admin' || data.type === 'admin_alert' || data.type === 'worker_update') && !isNewReport;
        })
        .map((data, idx) => ({
          id: snap.docs[idx].id,
          type: data.type as any,
          title: data.title || "Notification",
          message: formatMessage(data), // Use helper for cleaner text
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now(),
          reportId: data.reportId,
          action: data.action
        }));
      mergeAndSet();
    });
    return () => { unsubReports(); unsubNotifs(); };
  }, [lastClearedTs]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest("#notificationBell")) {
        setShowPanel(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const unseenCount = notifications.filter((r) => r.timestamp > lastSeenTs).length;
  const togglePanel = () => {
    setShowPanel(!showPanel);
    if (!showPanel && notifications.length > 0) setLS("last_seen_timestamp", notifications[0].timestamp);
  };

  const getIcon = (item: NotificationItem) => {
    if (item.type === "new_report") return <HiOutlineBell className="text-amber-500 w-5 h-5" />;

    // Handle Admin Alerts based on Action
    if (item.type === "admin_alert") {
      switch (item.action) {
        case 'start': return <HiOutlineClipboardList className="text-blue-600 w-5 h-5" />;
        case 'hold': return <HiOutlineBell className="text-orange-500 w-5 h-5" />; // Pause icon better? HiOutlinePause not imported. Using Bell for alert.
        case 'resume': return <HiOutlineClipboardList className="text-green-600 w-5 h-5" />;
        case 'complete': return <HiOutlineCheckCircle className="text-emerald-500 w-5 h-5" />;
        default: return <HiOutlineChatAlt2 className="text-gray-400 w-5 h-5" />;
      }
    }

    if (item.title.includes("Started")) return <HiOutlineClipboardList className="text-blue-500 w-5 h-5" />;
    if (item.title.includes("Completed")) return <HiOutlineCheckCircle className="text-green-500 w-5 h-5" />;
    if (item.title.includes("Verified")) return <HiOutlineCheckCircle className="text-green-500 w-5 h-5" />;
    if (item.title.includes("Declined")) return <HiOutlineXCircle className="text-red-500 w-5 h-5" />;
    return <HiOutlineChatAlt2 className="text-gray-400 w-5 h-5" />;
  };

  const hour = now.getHours();
  let greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    // ✅ FIXED: Lowered z-index to z-40 so popups (usually z-50+) appear on top
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 px-8 py-4">
      <div className="flex items-center justify-between max-w-[1600px] mx-auto">

        {/* LEFT: LIVE GREETING & TIME */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {greeting}, {adminName.split(' ')[0] || "Admin"}
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            {now.toLocaleDateString("en-GB", { weekday: 'long', day: 'numeric', month: 'long' })} •
            <span className="ml-1 text-blue-600 font-bold">
              {now.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>

        {/* RIGHT: NOTIFICATIONS & PROFILE */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <button
              id="notificationBell"
              onClick={togglePanel}
              className={`p-3 rounded-2xl border transition-all duration-300 group ${showPanel ? "bg-black border-black text-white shadow-lg" : "bg-white border-gray-100 text-gray-500 hover:border-gray-300 shadow-sm"
                }`}
            >
              <FiBell className="w-5 h-5" />
              {unseenCount > 0 && !showPanel && (
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full" />
              )}
            </button>

            {showPanel && (
              <div ref={panelRef} className="absolute right-0 top-16 w-96 bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 animate-slideDown z-50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <button onClick={() => { setLS("last_cleared_timestamp", Date.now()); setNotifications([]); }} className="text-xs font-medium text-blue-600 hover:underline">Clear all</button>
                </div>
                {notifications.length === 0 ? (<p className="text-sm text-gray-400 text-center py-8">No new activity.</p>) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {notifications.map((item) => (
                      <div key={item.id} className={`p-4 rounded-2xl border transition-all flex gap-4 items-start ${item.type === 'new_report' ? 'bg-amber-50/50 border-amber-100' : 'bg-white border-gray-100'}`}>
                        <div className="mt-0.5">{getIcon(item)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{formatTimeAgo(item.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-2">{item.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-gray-200 mx-1" />

          {/* PROFILE SECTION */}
          <div className="flex items-center gap-3 pl-2 cursor-pointer group">
            <div className="text-right hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-gray-900">{adminName || "Loading..."}</p>
              <p className="text-xs text-gray-500">{adminRole}</p>
            </div>
            <img
              src={`https://ui-avatars.com/api/?name=${adminName || 'A'}&background=000&color=fff&bold=true`}
              alt="Admin"
              className="w-10 h-10 rounded-2xl shadow-sm border-2 border-white group-hover:border-gray-200"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;