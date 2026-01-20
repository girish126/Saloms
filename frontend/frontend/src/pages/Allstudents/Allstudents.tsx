import { useEffect, useMemo, useState } from "react";
import {
  validateAllStudentsForm,
  isValidPhone as isValidPhoneLocal,
  type AllStudentsFormData,
} from "../../utils/validators/students/allStudentsValidator";

import type { JSX } from "react/jsx-runtime";
import Sidebar from "../../components/layout/Sidebar";
import "./Allstudent.css";



type Student = {
  _id: string;
  admissionNo: string;
  className: string;
  sectionName: string | null;
  studentName: string;
  dateOfBirth?: string | null;
  fatherName?: string | null;
  noOfCommunication?: string | null;
  fatherEmailId?: string | null;
  address?: string | null;
  rfidNo?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  status?: number | null;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000/api";
const THEME_KEY = "ts-theme";

/** normalize backend row -> UI Student */
export const normalizeBackendRow = (r: any): Student => {
  const id = String(r.studentSeqNbr ?? r.id ?? r._id ?? "");

  const admissionNo = r.studentRegistrationNbr ?? r.admissionNo ?? r.admission_no ?? "";
  const className = r.className ?? r.class_name ?? "";
  const sectionName = r.csaction ?? r.sectionName ?? null;
  const studentName = (r.fullName ?? r.studentName ?? r.full_name ?? "").toString();
  const dateOfBirth = r.dateOfBirth ?? r.date_of_birth ?? null;

  // Accept either 'fatherName' or legacy names
  const fatherName = r.fatherName ?? r.parentFatherName ?? r.FATHER_NAME ?? null;
  // Accept fatherEmail or fatherEmailId or FATHER_EMAIL
  const fatherEmail = r.fatherEmail ?? r.fatherEmailId ?? r.parentFatherEmail ?? r.FATHER_EMAIL ?? null;

  const noOfCommunication = r.noOfCommunication ?? r.fatherPrimaryContact ?? r.parentFatherPhone ?? null;
  const address = r.address ?? r.ADDRESS ?? null;
  const rfidNo = r.tagId ?? r.rfidNo ?? r.TAGID ?? null;
  const createdAt = r.createDate ?? r.createdAt ?? null;
  const updatedAt = r.updatedAt ?? null;
  const status = r.status !== undefined && r.status !== null ? Number(r.status) : 1;

  return {
    _id: id,
    admissionNo,
    className,
    sectionName,
    studentName,
    dateOfBirth,
    fatherName,
    noOfCommunication,
    fatherEmailId: fatherEmail ?? null,
    address,
    rfidNo,
    createdAt,
    updatedAt,
    status,
  };
};

async function requestWithFallback(urls: string[], opts?: RequestInit) {
  let lastErr: any = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, opts);
      if (res.status === 404) {
        lastErr = { status: 404, url: u };
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("All requests failed");
}

export default function AllStudents(): JSX.Element {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [theme, _setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "dark") return "dark";
      if (stored === "light") return "light";
    } catch {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
    // DELETE student
  const handleDelete = async (s: Student) => {
    if (!window.confirm(`Are you sure you want to delete ${s.studentName}?`)) return;

    try {
      const urls = [
        `${API_BASE}/students/${encodeURIComponent(s._id)}`,
        `${API_BASE}/all-students/${encodeURIComponent(s._id)}`,
      ];

      const res = await requestWithFallback(urls, { method: "DELETE" });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        throw new Error(data?.message ?? "Failed to delete student");
      }

      // remove from UI
      setStudents((prev) => prev.filter((x) => x._id !== s._id));
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err?.message || "Error deleting student");
    }
  };


  const fetchStudents = async () => {
    setLoading(true);
    setError(null);

    try {
      const urls = [`${API_BASE}/students`, `${API_BASE}/all-students`];
      const res = await requestWithFallback(urls, { method: "GET" });

      if (!res.ok) throw new Error(`Failed to load students (${res.status})`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      const list = Array.isArray(data) ? data : data?.students ?? data?.data ?? [];

      setStudents(list.map((r: any) => normalizeBackendRow(r)));
    } catch (err: any) {
      console.error("fetchStudents error:", err);
      setError(err?.message ?? "Error fetching students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();

    const handler = (ev: any) => {
      const createdRaw = ev?.detail;
      if (!createdRaw) {
        fetchStudents();
        return;
      }
      const created = normalizeBackendRow(createdRaw);
      setStudents((prev) => {
        const exists = prev.some((s) => s._id === created._id || s.admissionNo === created.admissionNo);
        if (exists) {
          return prev.map((s) => (s._id === created._id || s.admissionNo === created.admissionNo ? created : s));
        }
        return [created, ...prev];
      });
    };

    window.addEventListener("studentCreated", handler as EventListener);
    return () => window.removeEventListener("studentCreated", handler as EventListener);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("theme-dark");
      root.classList.remove("theme-light");
    } else {
      root.classList.add("theme-light");
      root.classList.remove("theme-dark");
    }
  }, [theme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      if (!q) return true;
      return (
        (s.studentName ?? "").toLowerCase().includes(q) ||
        (s.admissionNo ?? "").toLowerCase().includes(q) ||
        (s.className ?? "").toLowerCase().includes(q) ||
        (s.sectionName ?? "").toLowerCase().includes(q) ||
        (s.fatherName ?? "").toLowerCase().includes(q) ||
        (s.address ?? "").toLowerCase().includes(q) ||
        String(s.noOfCommunication ?? "").includes(q)
      );
    });
  }, [students, query]);

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setShowEditModal(true);
  };

  const handleUpdateStudentLocally = (updated: Student) => {
    setStudents((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
  };


  const dividerStyle: React.CSSProperties = {
    width: 16,
    minWidth: 16,
    background: "#edf8f1",
    borderLeft: "1px solid #e0efe0",
    borderRight: "1px solid rgba(0,0,0,0.02)",
  };

  return (
    <>
      <div className={`allstudents-root ${theme === "dark" ? "theme-dark" : "theme-light"}`}>
        <div className="container-fluid">
          <div className="row gx-0" style={{ alignItems: "stretch" }}>
            <Sidebar />

            {/* pale vertical strip divider */}
            <div aria-hidden style={dividerStyle} />

            <main className="col p-3">
              <div className="container">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 style={{ color: "var(--text)" }}>All Students</h3>
                  <div>
                    <button className="btn btn-sm btn-outline-secondary" onClick={fetchStudents}>
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="controls-row mb-3" style={{ display: "flex", gap: 8 }}>
                  <input
                    className="form-control"
                    placeholder="Search by name, admission no, class, section, address or phone..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>

                {loading && <div>Loading students...</div>}
                {error && <div className="alert alert-danger">{error}</div>}

                {!loading && filtered.length === 0 && <div className="alert alert-info">No students found.</div>}

                {!loading && filtered.length > 0 && (
                  <div className="table-responsive panel">
                    <table className="table table-hover align-middle">
                      <thead>
                        <tr>
                          <th className="col-adm">Admission No.</th>
                          <th className="col-name">Student Name</th>
                          <th>Class</th>
                          <th>Section</th>
                          <th className="col-tag">RFID</th>
                          <th>Father</th>
                          <th>Contact</th>
                          <th>Status</th>
                          <th className="col-actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s: Student) => (
                          <tr key={s._id}>
                            <td className="col-adm">
                              <span className="truncate">{s.admissionNo}</span>
                            </td>

                            <td className="col-name">
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span
                                  aria-hidden
                                  title={s.status === 1 ? "Active" : "Inactive"}
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    backgroundColor: s.status === 1 ? "#28a745" : "#dc3545",
                                    display: "inline-block",
                                    boxShadow: "0 0 0 2px rgba(0,0,0,0.03)",
                                  }}
                                />
                                <div style={{ fontWeight: 700 }}>{s.studentName}</div>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--muted-on-card)" }} className="truncate">
                                {s.address}
                              </div>
                            </td>

                            <td>{s.className}</td>
                            <td>{s.sectionName ?? "-"}</td>

                            <td className="col-tag">
                              <span className="tag-box">{s.rfidNo ?? "-"}</span>
                            </td>

                            <td style={{ maxWidth: 260 }}>
                              <div className="truncate">{s.fatherName ?? "-"}</div>
                            </td>

                            <td style={{ maxWidth: 260 }}>
                              <div className="truncate">{s.noOfCommunication ?? "-"}</div>
                            </td>

                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 999,
                                    backgroundColor: s.status === 1 ? "#28a745" : "#dc3545",
                                    display: "inline-block",
                                  }}
                                />
                                <small style={{ color: "var(--muted-on-card)" }}>{s.status === 1 ? "Active" : "Inactive"}</small>
                              </div>
                            </td>

                           <td className="col-actions">
                           <button
                             className="btn btn-sm btn-primary me-2"
                              onClick={() => openEdit(s)}
                               aria-label={`Edit ${s.studentName}`}
                               >
                              Edit
                              </button>

                              <button
                                 className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(s)}
                                aria-label={`Delete ${s.studentName}`}
                                >
                                Delete
                               </button>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {showEditModal && editingStudent && (
                  <>
                    <div className="modal-backdrop-custom" />
                    <EditStudentModal
                      student={editingStudent}
                      onClose={() => setShowEditModal(false)}
                      onSaved={(updated) => {
                        handleUpdateStudentLocally(updated);
                        setShowEditModal(false);
                      }}
                    />
                  </>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

/** Edit modal component (sends fatherName + fatherEmail) */
function EditStudentModal({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: (s: Student) => void }) {
  const [form, setForm] = useState<Student>({ ...student });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Student, string>>>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      ...student,
      admissionNo: student.admissionNo ?? "",
      className: student.className ?? "",
      sectionName: student.sectionName ?? "",
      studentName: student.studentName ?? "",
      fatherName: student.fatherName ?? "",
      noOfCommunication: student.noOfCommunication ?? "",
      fatherEmailId: student.fatherEmailId ?? "",
      address: student.address ?? "",
      rfidNo: student.rfidNo ?? "",
      status: student.status ?? 1,
      _id: student._id,
      createdAt: student.createdAt ?? null,
      updatedAt: student.updatedAt ?? null,
    });
    setFieldErrors({});
    setMessage(null);
  }, [student]);

  const handleChange = (field: keyof Student, value: string | number | null | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value as any }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const save = async () => {
    setMessage(null);

    const validatorForm: AllStudentsFormData = {
      admissionNo: form.admissionNo ?? null,
      className: form.className ?? null,
      sectionName: form.sectionName ?? null,
      studentName: form.studentName ?? null,
      dateOfBirth: form.dateOfBirth ?? null,
      fatherName: form.fatherName ?? null,
      noOfCommunication: form.noOfCommunication ?? null,
      fatherEmailId: form.fatherEmailId ?? null,
      address: form.address ?? null,
      rfidNo: form.rfidNo ?? null,
    };

    const errors = validateAllStudentsForm(validatorForm);
    if (errors.length > 0) {
      setMessage(errors[0]);
      const map: Partial<Record<keyof Student, string>> = {};
      errors.forEach((msg) => {
        const lower = msg.toLowerCase();
        if (lower.includes("admission")) map.admissionNo = msg;
        if (lower.includes("student") && lower.includes("name")) map.studentName = msg;
        if (lower.includes("class")) map.className = msg;
        if (lower.includes("birth") || lower.includes("dob")) map.dateOfBirth = msg;
        if (lower.includes("father") && lower.includes("name")) map.fatherName = msg;
        if (lower.includes("contact") || (lower.includes("phone") && !lower.includes("father email"))) map.noOfCommunication = msg;
        if (lower.includes("father") && lower.includes("email")) map.fatherEmailId = msg;
        if (lower.includes("address")) map.address = msg;
        if (lower.includes("rfid")) map.rfidNo = msg;
      });
      setFieldErrors(map);
      return;
    }

    if (!isValidPhoneLocal(form.noOfCommunication)) {
      setFieldErrors((prev) => ({ ...prev, noOfCommunication: "Phone must be 10 digits" }));
      setMessage("Contact number must be exactly 10 digits.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        className: form.className?.trim() || null,
        csaction: form.sectionName?.trim() || null,
        tagId: form.rfidNo?.trim() || null,
        fullName: (form.studentName || "").trim(),
        studentRegistrationNbr: form.admissionNo?.trim() || null,
        dateOfBirth: form.dateOfBirth ?? null,
        fatherName: (form.fatherName ?? "").trim() || null,
        fatherEmail: (form.fatherEmailId ?? "").trim() || null,
        fatherEmailId: (form.fatherEmailId ?? "").trim() || null,
        noOfCommunication: form.noOfCommunication?.trim() ?? null,
        address: form.address?.trim() ?? null,
        status: form.status !== undefined && form.status !== null ? Number(form.status) : 1,
      };

      const urls = [
        `${API_BASE}/students/${encodeURIComponent(form._id)}`,
        `${API_BASE}/all-students/${encodeURIComponent(form._id)}`,
      ];

      const res = await requestWithFallback(urls, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) {
        const msg = data?.message ?? text ?? "Failed to update student";
        throw new Error(msg);
      }

      // server may return { student: {...} } or the student object directly
      const updatedRaw = data?.student ?? data ?? {};

      // Merge server values with local fallback to ensure parent fields persist visually
      const merged: Student = {
        ...normalizeBackendRow(updatedRaw),
        admissionNo: updatedRaw.studentRegistrationNbr ?? updatedRaw.admissionNo ?? form.admissionNo ?? "",
        className: updatedRaw.className ?? form.className ?? "",
        sectionName: updatedRaw.csaction ?? updatedRaw.sectionName ?? form.sectionName ?? "",
        studentName: (updatedRaw.fullName ?? updatedRaw.studentName ?? form.studentName ?? "").toString(),
        // prefer server fatherName / fatherEmail — but fallback to the form we just sent
        fatherName: updatedRaw.fatherName ?? updatedRaw.FATHER_NAME ?? form.fatherName ?? "",
        fatherEmailId: updatedRaw.fatherEmail ?? updatedRaw.fatherEmailId ?? form.fatherEmailId ?? "",
        noOfCommunication: updatedRaw.noOfCommunication ?? form.noOfCommunication ?? "",
        address: updatedRaw.address ?? form.address ?? "",
        rfidNo: updatedRaw.tagId ?? updatedRaw.rfidNo ?? form.rfidNo ?? "",
        status: updatedRaw.status !== undefined && updatedRaw.status !== null ? Number(updatedRaw.status) : Number(form.status ?? 1),
        _id: String(updatedRaw._id ?? updatedRaw.id ?? updatedRaw.studentSeqNbr ?? form._id),
        createdAt: updatedRaw.createDate ?? form.createdAt ?? null,
        updatedAt: updatedRaw.updatedAt ?? new Date().toISOString(),
      };

      onSaved(merged);
    } catch (err: any) {
      console.error("Update error:", err);
      setMessage(err?.message || "Error updating student");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal show d-block" tabIndex={-1} role="dialog" aria-modal="true" style={{ pointerEvents: "auto" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Student — {student.studentName}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="modal-body">
            {message && <div className="alert alert-danger">{message}</div>}

            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label">Admission No.</label>
                <input className="form-control" value={form.admissionNo ?? ""} onChange={(e) => handleChange("admissionNo", e.target.value)} />
                {fieldErrors.admissionNo && <small className="text-danger">{fieldErrors.admissionNo}</small>}
              </div>

              <div className="col-md-4">
                <label className="form-label">Class</label>
                <input className="form-control" value={form.className ?? ""} onChange={(e) => handleChange("className", e.target.value)} />
                {fieldErrors.className && <small className="text-danger">{fieldErrors.className}</small>}
              </div>

              <div className="col-md-4">
                <label className="form-label">Section</label>
                <input className="form-control" value={form.sectionName ?? ""} onChange={(e) => handleChange("sectionName", e.target.value)} />
              </div>

              <div className="col-md-6">
                <label className="form-label">Student Name</label>
                <input className="form-control" value={form.studentName ?? ""} onChange={(e) => handleChange("studentName", e.target.value)} />
                {fieldErrors.studentName && <small className="text-danger">{fieldErrors.studentName}</small>}
              </div>

              <div className="col-md-6">
                <label className="form-label">Father Name</label>
                <input className="form-control" value={form.fatherName ?? ""} onChange={(e) => handleChange("fatherName", e.target.value)} />
                {fieldErrors.fatherName && <small className="text-danger">{fieldErrors.fatherName}</small>}
              </div>

              <div className="col-md-6">
                <label className="form-label">Contact</label>
                <input className="form-control" value={form.noOfCommunication ?? ""} onChange={(e) => handleChange("noOfCommunication", e.target.value)} />
                {fieldErrors.noOfCommunication && <small className="text-danger">{fieldErrors.noOfCommunication}</small>}
              </div>

              <div className="col-md-6">
                <label className="form-label">Father Email</label>
                <input className="form-control" value={form.fatherEmailId ?? ""} onChange={(e) => handleChange("fatherEmailId", e.target.value)} />
                {fieldErrors.fatherEmailId && <small className="text-danger">{fieldErrors.fatherEmailId}</small>}
              </div>

              <div className="col-12">
                <label className="form-label">Address</label>
                <textarea className="form-control" rows={2} value={form.address ?? ""} onChange={(e) => handleChange("address", e.target.value)} />
                {fieldErrors.address && <small className="text-danger">{fieldErrors.address}</small>}
              </div>

              <div className="col-md-6">
                <label className="form-label">RFID No.</label>
                <input className="form-control" value={form.rfidNo ?? ""} onChange={(e) => handleChange("rfidNo", e.target.value)} />
                {fieldErrors.rfidNo && <small className="text-danger">{fieldErrors.rfidNo}</small>}
              </div>

              {/* NEW: Status control */}
              <div className="col-md-6">
                <label className="form-label">Status</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    className="form-select"
                    value={String(form.status ?? 1)}
                    onChange={(e) => handleChange("status", Number(e.target.value))}
                  >
                    <option value="1">Active (1)</option>
                    <option value="0">Inactive (0)</option>
                  </select>

                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        backgroundColor: Number(form.status) === 1 ? "#28a745" : "#dc3545",
                        display: "inline-block",
                        marginRight: 6,
                        boxShadow: "0 0 0 2px rgba(0,0,0,0.03)",
                      }}
                    />
                    <small style={{ color: "#6b746b" }}>{Number(form.status) === 1 ? "Active" : "Inactive"}</small>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
