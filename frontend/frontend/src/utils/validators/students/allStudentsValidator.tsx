export type AllStudentsFormData = {
  admissionNo?: string | null;
  className?: string | null;
  sectionName?: string | null;
  studentName?: string | null;
  dateOfBirth?: string | null;
  fatherName?: string | null;
  noOfCommunication?: string | number | null;
  fatherEmailId?: string | null;
  address?: string | null;
  rfidNo?: string | null;
  status?: string | number | null; 
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ✅ ONLY CHANGE IS HERE
export const isValidPhone = (
  phone?: string | number | null | undefined
): boolean => {
  if (phone === undefined || phone === null) return false;
  const val = String(phone).trim();
  return /^\d{10}$/.test(val); // exactly 10 digits, no more, no less
};

export const validateAllStudentsField = (
  name: keyof AllStudentsFormData,
  value?: string | number | null
): string | null => {
  const valStr = String(value ?? "").trim();

  switch (name) {
    case "studentName":
      if (!valStr) return "Full name is required.";
      if (valStr.length < 3) return "Full name is too short.";
      return null;

    case "className":
      if (!valStr) return "Class is required.";
      return null;

    case "sectionName":
      if (valStr && valStr.length > 6) return "Section looks too long.";
      return null;

    case "rfidNo":
      if (valStr && valStr.length > 0 && valStr.length < 4)
        return "RFID / Tag ID must be at least 4 characters.";
      return null;

    case "admissionNo":
      if (valStr && valStr.length > 0 && valStr.length < 2)
        return "Admission number is too short.";
      return null;

    case "noOfCommunication":
      if (!valStr) return "Contact number is required.";
      if (!isValidPhone(value)) return "Contact number must be exactly 10 digits.";
      return null;

    case "fatherEmailId":
      if (!valStr) return null; 
      return emailRegex.test(valStr) ? null : "Invalid email address.";

    case "fatherName":
      if (!valStr) return "Father name is required.";
      return null;

    case "address":
      if (!valStr) return "Address is required.";
      if (valStr.length < 4) return "Address is too short.";
      return null;

    default:
      return null;
  }
};

export const validateAllStudentsForm = (
  form: AllStudentsFormData
): string[] => {
  const errs: string[] = [];

  if (!String(form.studentName ?? "").trim()) errs.push("Full name is required.");
  if (!String(form.className ?? "").trim()) errs.push("Class is required.");

  if (!String(form.fatherName ?? "").trim()) errs.push("Father name is required.");

  if (!String(form.noOfCommunication ?? "").trim())
    errs.push("Contact number is required.");
  else if (!isValidPhone(form.noOfCommunication))
    errs.push("Contact number must be exactly 10 digits.");

  if (!String(form.address ?? "").trim()) errs.push("Address is required.");
  else if (String(form.address ?? "").trim().length < 4)
    errs.push("Address is too short.");

  const keys: (keyof AllStudentsFormData)[] = [
    "studentName",
    "className",
    "sectionName",
    "rfidNo",
    "admissionNo",
    "noOfCommunication",
    "fatherEmailId",
    "fatherName",
    "address",
  ];

  for (const k of keys) {
    const msg = validateAllStudentsField(k, form[k]);
    if (msg) errs.push(msg);
  }

  return Array.from(new Set(errs));
};

export async function isRfidUniqueRemote(rfid?: string | null): Promise<boolean> {
  const v = (rfid ?? "").toString().trim();
  if (!v) return true;

  try {
    const res = await fetch(
      `/api/students/check-rfid?rfid=${encodeURIComponent(v)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return true;
    const j = await res.json();
    if (typeof j?.unique === "boolean") return j.unique;
    if (typeof j?.exists === "boolean") return !j.exists;
    return true;
  } catch {
    return true;
  }
}

export async function validateRfidUniqueness(
  rfid?: string | null
): Promise<string | null> {
  const v = (rfid ?? "").toString().trim();
  if (!v) return null;
  if (v.length < 4) return "RFID / Tag ID must be at least 4 characters.";

  const unique = await isRfidUniqueRemote(v);
  return unique ? null : "RFID / Tag ID is already in use.";
}

export async function isAdmissionUniqueRemote(
  admission?: string | null
): Promise<boolean> {
  const v = (admission ?? "").toString().trim();
  if (!v) return true;

  try {
    const res = await fetch(
      `/api/students/check-admission?admission=${encodeURIComponent(v)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return true;
    const j = await res.json();
    if (typeof j?.unique === "boolean") return j.unique;
    if (typeof j?.exists === "boolean") return !j.exists;
    return true;
  } catch {
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

export default {
  validateAllStudentsForm,
  validateAllStudentsField,
  isValidPhone,
  isRfidUniqueRemote,          
  validateRfidUniqueness,     
  isAdmissionUniqueRemote,    
  validateAdmissionUniqueness 
};
