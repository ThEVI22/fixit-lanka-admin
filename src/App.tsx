// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./layout/DashboardLayout";

import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Teams from "./pages/Teams";
import Settings from "./pages/Settings";
import ReportDetails from "./pages/ReportDetails";
import AdminLogin from "./pages/AdminLogin";

// --- NEW STAFF MANAGEMENT IMPORTS ---
// Verify that these filenames match exactly (case-sensitive)

import StaffDirectory from "./pages/StaffDirectory";
// ------------------------------------

import ProtectedRoute from "./components/ProtectedRoute";
import AuthGate from "./components/AuthGate";

function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          {/* LOGIN PAGE */}
          <Route path="/login" element={<AdminLogin />} />

          {/* PROTECTED ROUTES */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ReportDetails />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/teams"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Teams />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />



          <Route
            path="/staff-directory"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <StaffDirectory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* FALLBACK REDIRECT */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;