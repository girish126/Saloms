export type AllStudentsFormData = {
  admissionNo?: string | null;
  className?: string | null;
  sectionName?: string | null;
  studentName?: string | null;
  dateOfBirth?: string | null;
  fatherName?: string | null;
  fatherPrimaryContact?: string | null;
  fatherEmailId?: string | null;
  address?: string | null;
  rfidNo?: string | null;
};

export const isValidPhone = (v?: string | null) =>
  typeof v === "string" && /^\d{10}$/.test(v);

export const validateAllStudentsForm = (p: AllStudentsFormData): string[] => {
  const errors: string[] = [];

  if (!p.studentName || !String(p.studentName).trim())
    errors.push("Student name is required");

  if (p.dateOfBirth) {
    const iso = String(p.dateOfBirth);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso))
      errors.push("Date of birth must be in YYYY-MM-DD format");
  }

  if (p.fatherPrimaryContact && !isValidPhone(p.fatherPrimaryContact))
    errors.push("Father phone must be 10 digits");

  if (
    p.fatherEmailId &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.fatherEmailId))
  )
    errors.push("Father email is invalid");

  if (p.rfidNo && String(p.rfidNo).trim().length < 3)
    errors.push("RFID must be at least 3 characters");

  return errors;
};

export default { validateAllStudentsForm, isValidPhone };
