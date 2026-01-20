import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard/Dashboard";
import Login from "./pages/login/Login";
import StudentForm from "./pages/Studentform/StudentForm";
import Masterdata from "./pages/Masterdata/Masterdata";
import Report from "./pages/Report/Report";
import Setting from "./pages/Setting/Setting";
import Allstudents from "./pages/Allstudents/Allstudents";
import Messages from "./pages/Message/message";

// AUTH GUARDS

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RequireAdmin: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const role = localStorage.getItem("userRole");
  if (role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// APP

export default function App() {
  return (
    <Routes>
      {/* ---------- PUBLIC ---------- */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* ---------- COMMON (ADMIN + EMPLOYEE) ---------- */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />

      <Route
        path="/report"
        element={
          <RequireAuth>
            <Report />
          </RequireAuth>
        }
      />

      <Route
        path="/messages"
        element={
          <RequireAuth>
            <Messages />
          </RequireAuth>
        }
      />

      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Setting />
          </RequireAuth>
        }
      />

      <Route
        path="/master-data"
        element={
          <RequireAuth>
            <Masterdata />
          </RequireAuth>
        }
      />

      {/* ---------- ADMIN ONLY ---------- */}
      <Route
        path="/add-student"
        element={
          <RequireAuth>
            <RequireAdmin>
              <StudentForm />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      <Route
        path="/allstudents"
        element={
          <RequireAuth>
            <RequireAdmin>
              <Allstudents />
            </RequireAdmin>
          </RequireAuth>
        }
      />

      {/* ---------- FALLBACK ---------- */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
