import React, { useEffect, useRef, useState } from "react";
import "./studentform.css";
import Sidebar from "../../components/layout/Sidebar";
import {
  validateStudentForm,
  validateStudentField,
  isValidPhone,
  type StudentFormData as ValidatorStudentFormData,
} from "../../utils/validators/students/studentValidator";

type FieldErrors = Partial<Record<keyof ValidatorStudentFormData, string | null>>;

const INITIAL_FORM: ValidatorStudentFormData = {
  schoolCode: "",
  zid: "1",
  className: "",
  sectionName: "",
  rfidNo: "",
  studentName: "",
  admissionNo: "",
  noOfCommunication: "",
  status: "1",
  createdBy: "web",

  fatherName: "",
  fatherEmailId: "",

  address: "",
};

const MESSAGE_DURATION = 2500;

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:4000";

const StudentForm: React.FC = () => {
  const [formData, setFormData] = useState<ValidatorStudentFormData>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const messageTimeoutRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const clearMessageTimeout = () => {
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
  };

  const showError = (msg: string) => {
    clearMessageTimeout();
    setError(msg);
    setSuccess(null);
    messageTimeoutRef.current = window.setTimeout(() => setError(null), MESSAGE_DURATION);
  };

  const showSuccess = (msg: string) => {
    clearMessageTimeout();
    setSuccess(msg);
    setError(null);
    messageTimeoutRef.current = window.setTimeout(() => setSuccess(null), MESSAGE_DURATION);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    let value = (e.target as HTMLInputElement).value;
    if (name === "status") value = "1";

    if (name === "noOfCommunication") {
      const onlyDigits = value.replace(/\D/g, "");
      value = onlyDigits.slice(0, 10);
    }

    setFormData((p) => ({ ...p, [name]: value }));

    try {
      const err = validateStudentField(name as keyof ValidatorStudentFormData, value);
      setFieldErrors((prev) => ({ ...prev, [name as keyof ValidatorStudentFormData]: err }));
    } catch {
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const validatorForm: ValidatorStudentFormData = { ...formData };
    const errors = validateStudentForm(validatorForm);
    if (errors.length > 0) {
      showError(errors[0]);
      const mapErr: FieldErrors = {};
      errors.forEach((m) => {
        const lower = m.toLowerCase();
        if (lower.includes("full name") || lower.includes("name is required")) mapErr.studentName = m;
        if (lower.includes("class")) mapErr.className = m;
        if (lower.includes("status")) mapErr.status = m;
        if (lower.includes("contact") || lower.includes("phone") || lower.includes("communication")) mapErr.noOfCommunication = m;
        if (lower.includes("tag") || lower.includes("rfid")) mapErr.rfidNo = m;
        if (lower.includes("address")) mapErr.address = m;
        if (lower.includes("father")) {
          if (lower.includes("email")) mapErr.fatherEmailId = m;
          else mapErr.fatherName = m;
        }
        if (lower.includes("zid")) mapErr.zid = m as any;
      });
      setFieldErrors((p) => ({ ...p, ...mapErr }));
      return;
    }

    if (!isValidPhone(formData.noOfCommunication)) {
      setFieldErrors((p) => ({ ...p, noOfCommunication: "Phone must be 10 digits" }));
      showError("Contact number must be exactly 10 digits.");
      return;
    }

    setSubmitting(true);
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const payload = {
        className: formData.className || null,
        csaction: formData.sectionName || null,
        tagId: formData.rfidNo || null,
        fullName: (formData.studentName || "").trim(),
        studentRegistrationNbr: formData.admissionNo || null,
        noOfCommunication: formData.noOfCommunication || null,
        status: Number(formData.status ?? 1),
        createdBy: formData.createdBy || "web",
        fatherName: formData.fatherName || null,
        fatherEmailId: formData.fatherEmailId || null,
        address: formData.address || null,
      };

      console.log("Sending payload to", API_BASE + "/api/students", payload);

      const res = await fetch(`${API_BASE}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (parseErr) {
        console.warn("Failed to parse response JSON:", parseErr, "text:", text);
      }

      if (!res.ok) {
        console.error("Server returned error:", res.status, text);
        const backendMsg = data?.message ?? (data?.errors ? JSON.stringify(data.errors) : text);
        throw new Error(backendMsg || `HTTP ${res.status}`);
      }

      console.log("Create student response:", data);
      showSuccess("Student saved successfully.");
      setFormData(INITIAL_FORM);
      setFieldErrors({});
    } catch (err: any) {
      console.error("Fetch/create error:", err);
      const msg = err?.message ?? "Network error (Failed to fetch)";
      showError(msg);
    } finally {
      setSubmitting(false);
      abortRef.current = null;
    }
  };

  const renderFieldError = (field: keyof ValidatorStudentFormData) =>
    fieldErrors[field] ? <div className="invalid-feedback">{fieldErrors[field]}</div> : null;

  const dividerStyle: React.CSSProperties = {
    width: 16,
    minWidth: 16,
    background: "#edf8f1",
    borderLeft: "1px solid #e0efe0", 
    borderRight: "1px solid rgba(0,0,0,0.02)",
  };

  return (
    <div className="app-root" style={{ minHeight: "100vh" }}>
      <div className="container-fluid">
        <div className="row gx-0" style={{ alignItems: "stretch" }}>
          {/* Sidebar */}
          <Sidebar />

          {/* pale vertical strip divider (place between sidebar and main content) */}
          <div aria-hidden style={dividerStyle} />

          {/* Main content */}
          <main className="col d-flex align-items-center justify-content-center p-4">
            <div className="card p-4" style={{ width: "100%", maxWidth: 920, borderRadius: 12 }}>
              <div className="d-flex align-items-center mb-3">
                <div>
                  <h3 className="mb-0">Student Registration</h3>
                  <div style={{ fontSize: 13, color: "#6b746b" }}>Add a new student to the system</div>
                </div>
              </div>

              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <form onSubmit={handleSubmit} noValidate>
                {/* Row: Class + Section (ZID & School Code removed from UI) */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Class</label>
                    <input name="className" value={formData.className ?? ""} onChange={handleChange} className={`form-control ${fieldErrors.className ? "is-invalid" : ""}`} />
                    {renderFieldError("className")}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Section</label>
                    <input name="sectionName" value={formData.sectionName ?? ""} onChange={handleChange} className="form-control" />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">RFID / Tag ID</label>
                    <input name="rfidNo" value={formData.rfidNo ?? ""} onChange={handleChange} className={`form-control ${fieldErrors.rfidNo ? "is-invalid" : ""}`} />
                    {renderFieldError("rfidNo")}
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Admission No.</label>
                    <input name="admissionNo" value={formData.admissionNo ?? ""} onChange={handleChange} className="form-control" />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label fw-semibold">Status</label>
                    <div className="d-flex align-items-center">
                      <select
                        name="status"
                        value={String(formData.status ?? "1")}
                        onChange={handleChange}
                        className={`form-select ${fieldErrors.status ? "is-invalid" : ""}`}
                        disabled
                      >
                        <option value="1">Active (1)</option>
                        <option value="0">Inactive (0)</option>
                      </select>

                      <span style={{ display: "inline-flex", alignItems: "center", marginLeft: 8 }}>
                        <span
                          aria-hidden
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            backgroundColor: String(formData.status) === "1" ? "#28a745" : "#dc3545",
                            display: "inline-block",
                            marginRight: 6,
                            boxShadow: "0 0 0 2px rgba(0,0,0,0.03)",
                          }}
                        />
                        <small style={{ color: "#6b746b" }}>{String(formData.status) === "1" ? "Active" : "Inactive"}</small>
                      </span>
                    </div>
                    {renderFieldError("status")}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Full Name</label>
                    <input name="studentName" value={formData.studentName ?? ""} onChange={handleChange} className={`form-control ${fieldErrors.studentName ? "is-invalid" : ""}`} required />
                    {renderFieldError("studentName")}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Contact no.</label>
                    <input
                      name="noOfCommunication"
                      value={formData.noOfCommunication ?? ""}
                      onChange={handleChange}
                      className={`form-control ${fieldErrors.noOfCommunication ? "is-invalid" : ""}`}
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="10 digits"
                    />
                    {renderFieldError("noOfCommunication")}
                  </div>
                </div>

                <hr />

                <h5 className="fw-bold text-secondary mt-3 mb-2">Parent Detail</h5>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Father Name</label>
                    <input name="fatherName" value={formData.fatherName ?? ""} onChange={handleChange} className={`form-control ${fieldErrors.fatherName ? "is-invalid" : ""}`} />
                    {renderFieldError("fatherName")}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold">Father Email</label>
                    <input name="fatherEmailId" value={formData.fatherEmailId ?? ""} onChange={handleChange} className={`form-control ${fieldErrors.fatherEmailId ? "is-invalid" : ""}`} />
                    {renderFieldError("fatherEmailId")}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Address</label>
                  <textarea name="address" value={formData.address ?? ""} onChange={handleChange} className={`form-control ${fieldErrors.address ? "is-invalid" : ""}`} rows={2} />
                  {renderFieldError("address")}
                </div>

                <div className="d-grid mt-3">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                    {submitting ? "Saving..." : "Submit Student Details"}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudentForm;
