import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import "./attendance-report.css";


const API_BASE = "http://localhost:4000/api";

// ================= TYPES =================

type ReportRow = {
  id: number;
  tagId: string | null;
  name: string | null;
  inTime: string | null;
  outTime: string | null;
  date?: string;
  message: string;
  status: "Present" | "Pending" | "Absent";
};

// ================= PAGE =================

const AttendanceReport = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // ================= FETCH =================

  const loadReport = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
      });

      const url = `${API_BASE}/report/attendance?${params.toString()}`;
      console.log("Fetching:", url);

      const res = await fetch(url);
      const data = await res.json();

      console.log("API DATA:", data);

      if (data.ok) setRows(data.rows || []);
      else setRows([]);
    } catch (err) {
      console.error("Report load failed", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [fromDate, toDate]);

  // ================= FILTER =================

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const text = `${r.name ?? ""} ${r.tagId ?? ""}`.toLowerCase();
      return !search.trim() || text.includes(search.toLowerCase());
    });
  }, [rows, search]);

  // ================= DOWNLOAD =================

  const downloadCSV = () => {
    if (filteredRows.length === 0) return;

    const headers = ["Date", "Tag", "Name", "In Time", "Out Time"];

    const csvRows = filteredRows.map((r) => [
      r.date ?? "",
      r.tagId ?? "",
      r.name ?? "",
      r.inTime ?? "",
      r.outTime ?? "",
    ]);

    const csvContent =
      [headers, ...csvRows]
        .map((row) =>
          row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ================= RENDER =================

  return (
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
          <h3 className="mb-3">Attendance Report</h3>

          {/* FILTERS */}
          <div className="row g-2 mb-3">
            <div className="col-md-3">
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Search by student name or tag"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={loadReport}>
                Refresh
              </button>
            </div>
          </div>

          <div className="mb-3 text-end">
            <button
              className="btn btn-success"
              onClick={downloadCSV}
              disabled={filteredRows.length === 0}
            >
              ⬇ Download Report
            </button>
          </div>

          {/* TABLE */}
          <div className="table-responsive">
            <table className="table table-bordered table-sm align-middle">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Tag</th>
                  <th>Name</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center">Loading...</td>
                  </tr>
                )}

                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center">No records</td>
                  </tr>
                )}

                {!loading &&
                  filteredRows.map((r, i) => (
                    <tr key={`${r.id}-${r.date}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{r.date ?? "-"}</td>
                      <td>{r.tagId ?? "-"}</td>
                      <td>{r.name ?? "-"}</td>
                      <td>{r.inTime ?? "-"}</td>
                      <td>{r.outTime ?? "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AttendanceReport;
