import React, { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import logo from "../../assets/image.jpg";
import "./dashboard-animations.css";


//  TYPES 

type ActivityRow = {
  id: number;
  admissionCode: string | null;
  name: string | null;
  inTime: string | null;
  outTime: string | null;
  messageError?: string | null;
  status: "Present" | "Pending" | "Absent";
};

type Stats = {
  total: number;
  present: number;
  pending: number;
  absent: number;
};

//CONFIG 

const RAW_API_BASE =
  ((import.meta as any).env?.VITE_API_BASE as string | undefined) ??
  "http://localhost:4000/api";

const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

const DEFAULT_STATS: Stats = {
  total: 0,
  present: 0,
  pending: 0,
  absent: 0,
};

//  METER COMPONENT 

const AttendanceMeter: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
}> = ({ label, value, total, color }) => {
  const percent = total ? Math.round((value / total) * 100) : 0;

  return (
    <div className="text-center">
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `conic-gradient(${color} ${percent * 3.6}deg, #e9ecef 0deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "auto",
        }}
      >
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: "50%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {percent}%
        </div>
      </div>
      <div className="mt-2">
        <strong>{label}</strong>
        <div className="text-muted small">
          {value} / {total}
        </div>
      </div>
    </div>
  );
};

// PAGE 

const Dashboard: React.FC = () => {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);

  // FETCh

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dashboard/today`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error("Failed to load dashboard");

      // Sort by first scan (earliest inTime first)
      const sortedRows = (data.rows || [])
        .slice()
        .sort((a: ActivityRow, b: ActivityRow) => {
          if (!a.inTime && !b.inTime) return 0;
          if (!a.inTime) return 1;
          if (!b.inTime) return -1;
          return a.inTime.localeCompare(b.inTime);
        });

      setRows(sortedRows);
      setStats(data.stats || DEFAULT_STATS);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // AUTO REFRESH

  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  // RENDER 

  return (
    <div className="min-vh-100 bg-light">
      {/* ---------- NAVBAR ---------- */}
      <nav className="navbar navbar-light bg-white shadow-sm px-3">
        <div className="d-flex align-items-center">
          <img
            src={logo}
            alt="Logo"
            width={40}
            height={40}
            className="rounded-circle me-2"
          />
          <strong>Dashboard</strong>
        </div>

        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={fetchDashboard}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </nav>

      <div className="container-fluid">
        <div className="row">
          <Sidebar />

          <div
            aria-hidden
            style={{
              width: 16,
              minWidth: 16,
              background: "rgba(25,135,84,0.06)",
              borderLeft: "1px solid #e0efe0",
              borderRight: "1px solid rgba(0,0,0,0.02)",
            }}
          />

          <main className="col p-4">
            {/* ---------- STATS CARDS ---------- */}
            <div className="row mb-4">
              {[
                ["Total", stats.total, "text-dark"],
                ["Present", stats.present, "text-success"],
                ["Pending", stats.pending, "text-warning"],
                ["Absent", stats.absent, "text-danger"],
              ].map(([label, value, cls], i) => (
                <div key={i} className="col-md-3">
                  <div className="card shadow-sm text-center">
                    <div className={`card-body ${cls}`}>
                      <h6>{label}</h6>
                      <h3>{value}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ---------- METERS ---------- */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h5 className="text-center mb-4">
                  Attendance Overview
                </h5>
                <div className="row">
                  <div className="col-md-3">
                    <AttendanceMeter
                      label="Overall"
                      value={stats.present}
                      total={stats.total}
                      color="#198754"
                    />
                  </div>
                  <div className="col-md-3">
                    <AttendanceMeter
                      label="Present"
                      value={stats.present}
                      total={stats.total}
                      color="#28a745"
                    />
                  </div>
                  <div className="col-md-3">
                    <AttendanceMeter
                      label="Pending"
                      value={stats.pending}
                      total={stats.total}
                      color="#ffc107"
                    />
                  </div>
                  <div className="col-md-3">
                    <AttendanceMeter
                      label="Absent"
                      value={stats.absent}
                      total={stats.total}
                      color="#dc3545"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ---------- TABLE (Message & Status REMOVED) ---------- */}
            <div className="table-responsive">
              <table className="table table-bordered table-sm align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tag</th>
                    <th>Name</th>
                    <th>In</th>
                    <th>Out</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">
                        No records
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, i) => (
                      <tr key={r.id}>
                        <td>{i + 1}</td>
                        <td>{r.admissionCode ?? "-"}</td>
                        <td>{r.name ?? "-"}</td>
                        <td>{r.inTime ?? "-"}</td>
                        <td>{r.outTime ?? "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
