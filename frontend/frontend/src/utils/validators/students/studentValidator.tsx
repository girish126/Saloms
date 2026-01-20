export type StudentFormData = {
  schoolCode?: string;
  zid?: string;
  className?: string;
  sectionName?: string; 
  rfidNo?: string;      
  studentName?: string;
  admissionNo?: string; 
  noOfCommunication?: string; 
  status?: string | number;
  createdBy?: string;
  fatherName?: string;
  fatherEmailId?: string;
  address?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const extractDigits = (phone?: string | null) => (phone ?? "").replace(/\D/g, "");

export const isValidPhone = (phone?: string | null): boolean => {
  const digits = extractDigits(phone);
  return digits.length === 10;
};

export const validateStudentField = (
  name: keyof StudentFormData,
  value: string | undefined | null
): string | null => {
  const val = (value ?? "").toString();

  switch (name) {
    case "studentName": {
      if (!val.trim()) return "Full name is required.";
      if (val.trim().length < 3) return "Full name is too short.";
      return null;
    }

    case "className":
      if (!val.trim()) return "Class is required.";
      return null;

    case "sectionName":
      if (val && val.trim().length > 6) return "Section looks too long.";
      return null;

    case "rfidNo":
      if (val && val.trim().length > 0 && val.trim().length < 4)
        return "RFID / Tag ID must be at least 4 characters.";
      return null;

    case "status": {
      if (val === undefined || val === null || String(val).trim() === "") return "Status is required.";
      const n = Number(val);
      if (Number.isNaN(n)) return "Status must be a number.";
      return null;
    }

    case "admissionNo":
      if (val && val.trim().length > 0 && val.trim().length < 2)
        return "Admission number is too short.";
      return null;

    case "noOfCommunication": {
      if (!val.trim()) return "Contact number is required.";
      if (!isValidPhone(val)) return "Contact number must be exactly 10 digits.";
      return null;
    }

    case "fatherEmailId":
      if (!val.trim()) return null; 
      return emailRegex.test(val.trim()) ? null : "Invalid email address.";

    case "fatherName":
      if (!val.trim()) return "Father name is required.";
      if (val.trim().length < 2) return "Father name is too short.";
      return null;

    case "address":
      if (!val.trim()) return "Address is required.";
      if (val.trim().length < 4) return "Address is too short.";
      return null;

    default:
      return null;
  }
};

export const validateStudentForm = (form: StudentFormData): string[] => {
  const errs: string[] = [];

  if (!form.studentName || !String(form.studentName).trim()) errs.push("Full name is required.");
  if (!form.className || !String(form.className).trim()) errs.push("Class is required.");
  if (form.status === undefined || form.status === null || String(form.status).trim() === "")
    errs.push("Status is required.");

  if (!form.fatherName || !String(form.fatherName).trim())
    errs.push("Father name is required.");

  if (!form.noOfCommunication || !String(form.noOfCommunication).trim()) {
    errs.push("Contact number is required.");
  } else if (!isValidPhone(form.noOfCommunication)) {
    errs.push("Contact number must be exactly 10 digits.");
  }

  if (!form.address || !String(form.address).trim()) {
    errs.push("Address is required.");
  } else if (String(form.address).trim().length < 4) {
    errs.push("Address is too short.");
  }

  const keys: (keyof StudentFormData)[] = [
    "studentName",
    "className",
    "sectionName",
    "rfidNo",
    "status",
    "admissionNo",
    "noOfCommunication",
    "fatherEmailId",
    "fatherName",
    "address",
  ];

  for (const k of keys) {
    const m = validateStudentField(k, form[k] as string | undefined);
    if (m) errs.push(m);
  }
  return Array.from(new Set(errs));
};

export async function isRfidUniqueRemote(rfid?: string | null): Promise<boolean> {
  const v = (rfid ?? "").toString().trim();
  if (!v) return true;

  try {
    const url = `/api/students/check-rfid?rfid=${encodeURIComponent(v)}`;
    const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!res.ok) return true;

    const j = await res.json();
    if (typeof j === "object" && j !== null) {
      if (typeof j.unique === "boolean") return j.unique;
      if (typeof j.isUnique === "boolean") return j.isUnique;
      if (typeof j.ok === "boolean" && typeof j.exists === "boolean") return !j.exists;
    }
    if (typeof j.found === "number") return j.found === 0;
    return true;
  } catch (err) {
    console.warn("RFID uniqueness check failed:", err);
    return true;
  }
}

export async function validateRfidUniqueness(rfid?: string | null): Promise<string | null> {
  const v = (rfid ?? "").toString().trim();
  if (!v) return null; 
  if (v.length < 4) return "RFID / Tag ID must be at least 4 characters.";

  const unique = await isRfidUniqueRemote(v);
  return unique ? null : "RFID / Tag ID is already in use.";
}


export async function isAdmissionUniqueRemote(admission?: string | null): Promise<boolean> {
  const v = (admission ?? "").toString().trim();
  if (!v) return true;

  try {
    const url = `/api/students/check-admission?admission=${encodeURIComponent(v)}`;
    const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    if (!res.ok) return true;

    const j = await res.json();
    if (typeof j === "object" && j !== null) {
      if (typeof j.unique === "boolean") return j.unique;
      if (typeof j.isUnique === "boolean") return j.isUnique;
      if (typeof j.ok === "boolean" && typeof j.exists === "boolean") return !j.exists;
    }
    if (typeof j.found === "number") return j.found === 0;
    return true;
  } catch (err) {
    console.warn("Admission uniqueness check failed:", err);
    return true;
  }
}

export async function validateAdmissionUniqueness(
  admission?: string | null
): Promise<string | null> {
  const v = (admission ?? "").toString().trim();
  if (!v) return null;
  if (v.length < 2) return "Admission number is too short.";

  const unique = await isAdmissionUniqueRemote(v);
  return unique ? null : "Admission number is already in use.";
}

// DEFAULT EXPORT 

export default {
  isValidPhone,
  validateStudentField,
  validateStudentForm,
  isRfidUniqueRemote,
  validateRfidUniqueness,
  isAdmissionUniqueRemote,      
  validateAdmissionUniqueness,  
};
