import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import "./masterdata.css";

type Student = {
  id?: string;
  studentSeqNo?: number | null;
  admissionNo?: string;
  className?: string;
  sectionName?: string | null;
  studentName?: string;
  contactNo?: string | null;
  rfidNo?: string | null;
  status?: number | null;
  createDate?: string | null;

  fatherName?: string | null;
  fatherEmail?: string | null;
  address?: string | null;
};

const API_BASE = "http://localhost:4000/api";
const PER_PAGE = 15;

export default function MasterData(): React.ReactElement {
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);

  const normalize = (r: any): Student => {
    return {
      id: String(r.STUDENT_SEQ_NBR ?? r.studentSeqNbr ?? r.id ?? r._id ?? ""),
      studentSeqNo: r.STUDENT_SEQ_NBR ?? r.studentSeqNbr ?? null,
      admissionNo: r.STUDENT_REGISTRATION_NBR ?? r.admissionNo ?? "",
      className: r.CLASS_NAME ?? r.className ?? "",
      sectionName: r.CSACTION ?? r.csaction ?? r.sectionName ?? null,
      studentName: r.FULL_NAME ?? r.fullName ?? r.studentName ?? "",
      contactNo: r.NO_OF_COMMUNICATION ?? r.noOfCommunication ?? r.contactNo ?? null,
      rfidNo: r.TAGID ?? r.tagId ?? r.rfidNo ?? null,
      status: typeof r.STATUS === "number" ? r.STATUS : (r.status ? Number(r.status) : null),
      createDate: r.CREATE_DATE ?? r.createDate ?? null,
      fatherName: r.fatherName ?? r.FATHER_NAME ?? r.parentName ?? null,
      fatherEmail: r.fatherEmail ?? r.FATHER_EMAIL ?? r.fatherEmailId ?? null,
      address: r.address ?? r.ADDRESS ?? null,
    };
  };

  async function fetchStudents(limit = 10000) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      if (q) params.set("q", q);
      if (classFilter) params.set("className", classFilter);

      const url = `${API_BASE.replace(/\/api$/, "")}/api/masterdata/students?${params.toString()}`;
      const res = await fetch(url, { method: "GET" });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Failed to fetch (${res.status})`);
      }
      const json = await res.json();
      const listRaw: any[] = Array.isArray(json?.students) ? json.students : json?.students ?? [];

      const normalized = listRaw.map((r) => normalize(r));
      setRows(normalized);
      setPage(1);
    } catch (err: any) {
      console.error("fetchStudents error:", err);
      setError(err?.message ?? "Failed to fetch students");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents(10000);

    // Event handlers so this page stays in sync with student form page
    const onCreated = (ev: any) => {
      const raw = ev?.detail;
      if (!raw) return;
      const newRow = normalize(raw);
      setRows((prev) => {
        // avoid duplicates (match by seq or admission)
        const exists = prev.some((p) => p.id === newRow.id || (p.admissionNo && newRow.admissionNo && p.admissionNo === newRow.admissionNo));
        if (exists) {
          return prev.map((p) => (p.id === newRow.id || (p.admissionNo && newRow.admissionNo && p.admissionNo === newRow.admissionNo) ? { ...p, ...newRow } : p));
        }
        return [newRow, ...prev];
      });
    };

    const onUpdated = (ev: any) => {
      const raw = ev?.detail;
      if (!raw) return;
      const updated = normalize(raw);
      setRows((prev) => prev.map((r) => (r.id === updated.id || (r.admissionNo && updated.admissionNo && r.admissionNo === updated.admissionNo) ? { ...r, ...updated } : r)));
    };

    const onDeleted = (ev: any) => {
      const raw = ev?.detail;
      if (!raw) return;
      const id = String(raw.id ?? raw.studentSeqNbr ?? raw.STUDENT_SEQ_NBR ?? raw._id ?? "");
      if (!id) return;
      setRows((prev) => prev.filter((r) => String(r.id) !== id && String(r.studentSeqNo ?? "") !== id));
    };

    window.addEventListener("studentCreated", onCreated as EventListener);
    window.addEventListener("studentUpdated", onUpdated as EventListener);
    window.addEventListener("studentDeleted", onDeleted as EventListener);

    return () => {
      window.removeEventListener("studentCreated", onCreated as EventListener);
      window.removeEventListener("studentUpdated", onUpdated as EventListener);
      window.removeEventListener("studentDeleted", onDeleted as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    const cls = classFilter.trim().toLowerCase();

    return rows.filter((s) => {
      if (cls) {
        if (!String(s.className ?? "").toLowerCase().includes(cls)) return false;
      }

      if (!search) return true;

      const hay = [
        s.admissionNo,
        s.studentName,
        s.className,
        s.sectionName,
        s.contactNo,
        s.rfidNo,
        s.fatherName,
        s.fatherEmail,
        s.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(search);
    });
  }, [rows, q, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page, totalPages]);

  async function uploadFileToBackend(file: File | null) {
    if (!file) return;
    setImporting(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const url = `${API_BASE.replace(/\/api$/, "")}/api/masterdata/import`;

      const res = await fetch(url, { method: "POST", body: form });
      const txt = await res.text().catch(() => "");
      if (!res.ok) {
        let msg = txt || `Upload failed (${res.status})`;
        try {
          const j = JSON.parse(txt || "{}");
          if (j?.message) msg = j.message;
        } catch {}
        throw new Error(msg);
      }

      let message = "Import successful";
      try {
        const j = JSON.parse(txt || "{}");
        if (j?.message) message = j.message;
      } catch {
        if (txt) message = txt;
      }
      alert(message);

      // After import, re-fetch full list (import may affect many rows)
      await fetchStudents(10000);
    } catch (err: any) {
      console.error("uploadFileToBackend error:", err);
      setError(err?.message ?? String(err));
    } finally {
      setImporting(false);
    }
  }

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!(name.endsWith(".xls") || name.endsWith(".xlsx"))) {
      setError("Only Excel files (.xls, .xlsx) are supported for import.");
      return;
    }
    await uploadFileToBackend(file);
  };

  const exportExcel = async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (classFilter) params.set("className", classFilter);

      const url = `${API_BASE.replace(/\/api$/, "")}/api/masterdata/export/excel${params.toString() ? `?${params.toString()}` : ""}`;

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const filename = `students_export_${Date.now()}.xlsx`;
      const a = document.createElement("a");
      const urlBlob = URL.createObjectURL(blob);
      a.href = urlBlob;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(urlBlob);
    } catch (err: any) {
      console.error("exportExcel error:", err);
      setError(err?.message ?? "Export failed");
    }
  };

  const formatDate = (s?: string | null) => {
    if (!s) return "-";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().slice(0, 10) + " " + d.toTimeString().slice(0, 5);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8" }}>
      <div className="container-fluid">
        <div className="row gx-0" style={{ alignItems: "stretch" }}>
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
            <div style={{ background: "#fff", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>Master / Import & Export</h2>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>Search, import or export student records</div>
                </div>
                
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button onClick={exportExcel} style={{ padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", color: "#fff", background: "linear-gradient(90deg,#1d4ed8,#2563eb)" }} disabled={loading}>
                    {loading ? "Preparing..." : "Export (filtered Excel)"}
                  </button>

                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <div style={{ padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", color: "#fff", background: "linear-gradient(90deg,#10b981,#06b6d4)" }}>
                      {importing ? "Uploading..." : "Import (Excel)"}
                    </div>
                    <input type="file" accept=".xls,.xlsx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }} disabled={importing} />
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                <input style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", minWidth: 260, flex: 1 }} placeholder="Search admission / student / phone / rfid" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
                <input style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", minWidth: 180 }} placeholder="Filter class (e.g. Nursery)" value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }} />
                <button style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #3b82f6", background: "#fff", color: "#1d4ed8", cursor: "pointer" }} onClick={() => fetchStudents(10000)}>Apply</button>
              </div>

              {error && <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
                  <thead><tr>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Admission No.</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Class</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Section</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Student Name</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Contact no.</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>RFID No</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Status</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Created</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Father Name</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Father Email</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e6e6e6" }}>Address</th>
                  </tr></thead>

                  <tbody>
                    {paginated.length === 0 && !loading ? (
                      <tr><td colSpan={11} style={{ padding: 14, textAlign: "center", color: "#6b7280" }}>No records</td></tr>
                    ) : (
                      paginated.map((s, idx) => (
                        <tr key={s.id ?? idx}>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.admissionNo ?? "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.className ?? "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.sectionName ?? "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>{s.studentName ?? "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.contactNo ?? "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.rfidNo ?? "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.status != null ? String(s.status) : "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{formatDate(s.createDate ?? s.createDate)}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.fatherName ?? "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.fatherEmail ?? "-"}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{s.address ?? "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ color: "#6b7280" }}>Showing {filtered.length} rows (filtered)</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "8px 12px", borderRadius: 8 }}>Prev</button>
                  <span>{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: "8px 12px", borderRadius: 8 }}>Next</button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
