export type StudentFormData = {
  schoolCode?: string;
  zid?: string;
  className?: string;
  sectionName?: string;
  rfidNo?: string;

  // Accept UI and API name variants
  studentName?: string;
  fullName?: string;
  full_name?: string;

  admissionNo?: string;
  studentRegistrationNbr?: string;
  noOfCommunication?: string;
  status?: string | number;
  createdBy?: string;

  fatherName?: string;
  fatherPrimaryContact?: string;
  fatherEmailId?: string;

  address?: string;
};

const isEmpty = (v?: string | null) => !v || !v.trim();

export const isValidPhone = (v?: string | null) => {
  if (!v) return false;
  return /^\d{10}$/.test(String(v).trim());
};

export const getNormalizedFullName = (payload: Partial<StudentFormData>): string => {
  const raw =
    (payload.studentName as string | undefined) ??
    (payload.fullName as string | undefined) ??
    ((payload as any).full_name as string | undefined) ??
    "";
  return String(raw ?? "").trim();
};

export const validateStudentField = (field: keyof StudentFormData, value: any): string | null => {
  const v = value ?? "";
  switch (field) {
    case "studentName":
    case "fullName":
    case "full_name":
      if (isEmpty(String(v))) return "Full name is required";
      return null;

    case "status":
      if (v === undefined || v === null || isNaN(Number(v))) return "Status must be numeric";
      return null;

    case "rfidNo":
      if (v && String(v).trim().length < 3) return "RFID/Tag must be at least 3 characters";
      return null;

    case "noOfCommunication":
      if (v && isNaN(Number(v))) return "No. of communication must be a number";
      return null;

    case "fatherPrimaryContact":
      if (v && !isValidPhone(String(v))) return "Phone must be 10 digits";
      return null;

    default:
      return null;
  }
};

export const validateStudentForm = (payload: StudentFormData): string[] => {
  const errors: string[] = [];

  const name = getNormalizedFullName(payload);
  if (isEmpty(name)) errors.push("Full name is required");

  const statusVal = payload.status ?? undefined;
  if (statusVal === undefined || Number.isNaN(Number(statusVal))) {
    errors.push("Status is required and must be a number");
  }

  if (payload.rfidNo && String(payload.rfidNo).trim().length < 3) {
    errors.push("RFID/Tag ID must contain at least 3 characters");
  }

  if (payload.noOfCommunication && isNaN(Number(payload.noOfCommunication))) {
    errors.push("No. of communication must be a number");
  }

  if (payload.fatherPrimaryContact && !isValidPhone(payload.fatherPrimaryContact)) {
    errors.push("Father phone must be 10 digits");
  }

  if (payload.fatherEmailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.fatherEmailId))) {
    errors.push("Father email is invalid");
  }

  return errors;
};

export default { validateStudentForm, validateStudentField, isValidPhone, getNormalizedFullName };
