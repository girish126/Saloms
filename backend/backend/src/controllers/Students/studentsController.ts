import { Request, Response } from "express";
import StudentModel from "../../models/students/Studentmodel";
import { validateStudentForm, getNormalizedFullName } from "../../validators/student";

export const createStudentController = async (req: Request, res: Response) => {
  try {
    console.log("createStudentController - body:", req.body);

    const fullName = getNormalizedFullName(req.body);

    const payload = {
      schoolCode: req.body.schoolCode ?? "shalom",
      zid: "1",
      className: req.body.className ?? null,
      csaction: req.body.csaction ?? req.body.sectionName ?? null,
      tagId: req.body.tagId ?? req.body.rfidNo ?? null,
      fullName,
      studentRegistrationNbr: req.body.studentRegistrationNbr ?? req.body.admissionNo ?? null,
      noOfCommunication: req.body.noOfCommunication ?? null,
      status: Number(req.body.status ?? 1),
      ipAddress: req.ip ?? null,
      createdBy: req.body.createdBy ?? "web",
    };

    const parent = {
      fatherName: req.body.fatherName ?? null,
      fatherEmailId: req.body.fatherEmailId ?? null,
      address: req.body.address ?? null,
    };

    const uiPayload: any = { ...req.body, studentName: fullName, fullName };

    const errors = validateStudentForm(uiPayload);
    if (errors.length) {
      console.warn("Validation failed:", errors);
      return res.status(400).json({ ok: false, errors });
    }

    if (typeof (StudentModel as any).createStudentWithParent !== "function") {
      return res.status(501).json({ ok: false, message: "createStudentWithParent not implemented in model" });
    }

    const result = await (StudentModel as any).createStudentWithParent(payload, parent);
    const student = result.student ? (StudentModel as any).mapRow(result.student) : null;

    return res.status(201).json({ ok: true, student, parent: result.parentInserted ?? null });
  } catch (err: any) {
    console.error("createStudentController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Server error" });
  }
};


export const listStudentsController = async (req: Request, res: Response) => {
  try {
    if (typeof (StudentModel as any).getAllStudents !== "function") {
      return res.status(501).json({ ok: false, message: "getAllStudents not implemented in model" });
    }
    const limit = Number(req.query.limit) || 500;
    const rows = await (StudentModel as any).getAllStudents(limit);
    const mapped = rows.map((r: any) => (StudentModel as any).mapRow ? (StudentModel as any).mapRow(r) : r);
    return res.json({ ok: true, students: mapped });
  } catch (err: any) {
    console.error("listStudentsController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to fetch students" });
  }
};


export const getStudentController = async (req: Request, res: Response) => {
  try {
    if (typeof (StudentModel as any).getStudentById !== "function") {
      return res.status(501).json({ ok: false, message: "getStudentById not implemented in model" });
    }
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const row = await (StudentModel as any).getStudentById(id);
    if (!row) return res.status(404).json({ ok: false, message: "Student not found" });

    const student = (StudentModel as any).mapRow ? (StudentModel as any).mapRow(row) : row;
    return res.json({ ok: true, student });
  } catch (err: any) {
    console.error("getStudentController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Server error" });
  }
};


export const updateStudentController = async (req: Request, res: Response) => {
  try {
    if (typeof (StudentModel as any).updateStudent !== "function") {
      return res.status(501).json({ ok: false, message: "updateStudent not implemented in model" });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const payload: any = {
      className: req.body.className ?? null,
      csaction: req.body.csaction ?? req.body.sectionName ?? null,
      tagId: req.body.tagId ?? req.body.rfidNo ?? null,
      fullName: (req.body.fullName ?? req.body.studentName ?? "").trim(),
      studentRegistrationNbr: req.body.studentRegistrationNbr ?? req.body.admissionNo ?? null,
      noOfCommunication: req.body.noOfCommunication ?? null,
      status: req.body.status !== undefined ? Number(req.body.status) : undefined,
    };

    const updated = await (StudentModel as any).updateStudent(id, payload);
    if (!updated) return res.status(404).json({ ok: false, message: "Student not found" });

    const student = (StudentModel as any).mapRow ? (StudentModel as any).mapRow(updated) : updated;
    return res.json({ ok: true, student });
  } catch (err: any) {
    console.error("updateStudentController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to update student" });
  }
};


export const deleteStudentController = async (req: Request, res: Response) => {
  try {
    if (typeof (StudentModel as any).deleteStudent !== "function") {
      return res.status(501).json({ ok: false, message: "deleteStudent not implemented in model" });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const ok = await (StudentModel as any).deleteStudent(id);
    if (!ok) return res.status(404).json({ ok: false, message: "Student not found" });

    return res.json({ ok: true, message: "Deleted" });
  } catch (err: any) {
    console.error("deleteStudentController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to delete student" });
  }
};

export const importStudentsController = async (req: Request, res: Response) => {
  try {
    if (typeof (StudentModel as any).importStudents !== "function") {
      return res.status(501).json({ ok: false, message: "importStudents not implemented in model" });
    }

    const rowsAny: unknown[] = Array.isArray(req.body) ? req.body : req.body?.rows;
    if (!rowsAny || !Array.isArray(rowsAny)) {
      return res.status(400).json({ ok: false, message: "No rows provided" });
    }

    console.log("Received import rows length:", rowsAny.length);
    console.log("Incoming import rows sample:", (rowsAny as any[]).slice(0, 2));

    const pick = (r: any, ...keys: string[]) => {
      if (!r) return null;
      for (const k of keys) {
        if (Object.prototype.hasOwnProperty.call(r, k)) {
          const v = r[k];
          if (v === undefined) continue;
          return typeof v === "string" ? (v.trim() || null) : v ?? null;
        }
      }
      return null;
    };

    const normalized = (rowsAny as any[]).map((r: any) => {
      const fatherName = pick(r, "fatherName", "Father Name", "FATHER_NAME", "father_name", "parentName", "Parent Name");
      const fatherEmail = pick(r, "fatherEmail", "Father Email", "FATHER_EMAIL", "fatherEmailId", "FATHER_EMAIL_ID", "father_email");
      const address = pick(r, "address", "Address", "ADDRESS", "Full Address", "addr");

      return {
        schoolCode: pick(r, "schoolCode", "School_code", "School Code") ?? "shalom",
        zid: pick(r, "zid", "Zid", "ZID") ?? "1",
        className: pick(r, "className", "Class", "CLASS", "CLASS_NAME") ?? null,
        csaction: pick(r, "csaction", "Section", "sectionName", "SECTION") ?? null,
        tagId: pick(r, "tagId", "TAGID", "RFID No", "RFID", "rfidNo") ?? null,
        fullName: (pick(r, "fullName", "Student Name", "FULL_NAME", "studentName") ?? "").trim(),
        studentRegistrationNbr: pick(r, "studentRegistrationNbr", "Admission No", "admissionNo") ?? null,
        noOfCommunication: pick(r, "noOfCommunication", "Contact No", "Phone", "phone") ?? null,
        status: r.status !== undefined && r.status !== "" ? Number(r.status) : 1,
        createdBy: pick(r, "createdBy", "CreatedBy", "created_by") ?? "import",

        // Parent fields
        fatherName,
        fatherEmail,
        address,
      };
    });

    console.log("Normalized rows sample:", normalized.slice(0, 2));

    const result = await (StudentModel as any).importStudents(normalized);
    return res.json({ ok: true, inserted: result.inserted, errors: result.errors });
  } catch (err: any) {
    console.error("importStudentsController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to import students" });
  }
};


export const exportStudentsController = async (req: Request, res: Response) => {
  try {
    if (typeof (StudentModel as any).fetchStudentsForExport !== "function") {
      return res.status(501).json({ ok: false, message: "fetchStudentsForExport not implemented in model" });
    }

    const limit = Number(req.query.limit) || 10000;
    const rows = await (StudentModel as any).fetchStudentsForExport(limit);
    const mapped = rows.map((r: any) => (StudentModel as any).mapRow ? (StudentModel as any).mapRow(r) : r);
    return res.json({ ok: true, students: mapped });
  } catch (err: any) {
    console.error("exportStudentsController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to export students" });
  }
};

export default {
  createStudentController,
  listStudentsController,
  getStudentController,
  updateStudentController,
  deleteStudentController,
  importStudentsController,
  exportStudentsController,
};
