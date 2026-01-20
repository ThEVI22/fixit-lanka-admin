import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

import StatsGrid from "../components/dashboard/StatsGrid";
import RecentActivityTable from "../components/dashboard/RecentActivityTable";
import ActivityChart from "../components/dashboard/ActivityChart";
import CategoryChart from "../components/dashboard/CategoryChart";
import FieldOperationsWidget from "../components/dashboard/FieldOperationsWidget";

const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time synchronization logic
  useEffect(() => {
    const unsubReports = onSnapshot(collection(db, "all_reports"), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    const unsubTeams = onSnapshot(collection(db, "teams"), (snap) => {
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubStaff = onSnapshot(collection(db, "staff"), (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubReports();
      unsubTeams();
      unsubStaff();
      unsubUsers();
    };
  }, []);

  // System Metric Calculations
  const totalCommunity = users.length;
  const totalPersonnel = staff.filter(s => s.role === "Worker").length;
  const resolvedCount = reports.filter(r => r.status === "Resolved").length;
  const successRate = reports.length > 0 ? ((resolvedCount / reports.length) * 100).toFixed(0) : 0;

  const recentReports = [...reports]
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, 5);

  // --- ANALYTICS LOGIC ---
  const getActivityData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Create a map for quick lookup, initialized to 0
    const activityMap: Record<string, number> = {};
    last7Days.forEach(date => activityMap[date] = 0);

    reports.forEach(r => {
      // Must match the format above
      const date = new Date(r.createdAtMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (activityMap[date] !== undefined) {
        activityMap[date]++;
      }
    });

    return last7Days.map(date => ({ date, count: activityMap[date] }));
  };

  const activityData = getActivityData();

  const getCategoryData = () => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      const val = r.category || "Unknown";
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  };

  const categoryData = getCategoryData();

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* HEADER */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Overview</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">Command Center</h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Real-time city maintenance overview.</p>
      </div>

      {/* --- STATS GRID --- */}
      <StatsGrid
        totalCommunity={totalCommunity}
        totalPersonnel={totalPersonnel}
        activeUnits={teams.length}
        successRate={successRate}
      />

      {/* --- MAIN CONTENT GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column (Main) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Chart Section */}
          <ActivityChart data={activityData} />

          {/* Recent Activity Section */}
          <RecentActivityTable reports={recentReports} />
        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:col-span-4 space-y-6">
          <CategoryChart data={categoryData} />

          {/* New Widget */}
          <FieldOperationsWidget teams={teams} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;