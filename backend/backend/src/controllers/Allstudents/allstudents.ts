import { Request, Response } from "express";

import {
  getAllStudents,
  getStudentById,
  updateStudent,
  importStudents,
  fetchStudentsForExport,
  findByTagId,            
  findByAdmissionNo,     
} from "../../models/Allstudents/allstudents";

import { validateAllStudentsForm, isValidPhone } from "../../validators/allstudents";
import { deleteStudent, mapRow } from "../../models/students/Studentmodel";


export const listAllStudents = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 500;
    const rows = await getAllStudents(limit);
    return res.json({ ok: true, students: rows.map(mapRow) });
  } catch (err: any) {
    console.error("listAllStudents error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to fetch students" });
  }
};

export const deleteStudentController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    await deleteStudent(id);
    return res.json({ ok: true, message: "Student deleted successfully" });
  } catch (err: any) {
    console.error("deleteStudent error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
};


export const getStudent = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const row = await getStudentById(id);
    if (!row) return res.status(404).json({ ok: false, message: "Student not found" });

    return res.json({ ok: true, student: mapRow(row) });
  } catch (err: any) {
    console.error("getStudent error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Server error" });
  }
};

export const updateStudentController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ ok: false, message: "Invalid id" });

    const payload: any = {
      className: typeof req.body.className !== "undefined" ? req.body.className : undefined,
      csaction: typeof req.body.csaction !== "undefined" ? req.body.csaction : (typeof req.body.sectionName !== "undefined" ? req.body.sectionName : undefined),
      tagId: typeof req.body.tagId !== "undefined" ? req.body.tagId : (typeof req.body.rfidNo !== "undefined" ? req.body.rfidNo : undefined),
      fullName: typeof req.body.fullName !== "undefined" ? (req.body.fullName ?? req.body.studentName ?? "").trim() : undefined,
      studentRegistrationNbr: typeof req.body.studentRegistrationNbr !== "undefined" ? req.body.studentRegistrationNbr : (typeof req.body.admissionNo !== "undefined" ? req.body.admissionNo : undefined),
      noOfCommunication: typeof req.body.noOfCommunication !== "undefined" ? req.body.noOfCommunication : undefined,
      status: typeof req.body.status !== "undefined" ? (req.body.status !== null ? Number(req.body.status) : null) : undefined,
      createdBy: typeof req.body.createdBy !== "undefined" ? req.body.createdBy : undefined,

      fatherName: typeof req.body.fatherName !== "undefined" ? req.body.fatherName : undefined,
      fatherEmail: typeof req.body.fatherEmail !== "undefined"
        ? req.body.fatherEmail
        : typeof req.body.fatherEmailId !== "undefined"
        ? req.body.fatherEmailId
        : undefined,
      address: typeof req.body.address !== "undefined" ? req.body.address : undefined,
    };

    const ui = {
      admissionNo: payload.studentRegistrationNbr,
      className: payload.className,
      sectionName: payload.csaction,
      studentName: payload.fullName,
      fatherPrimaryContact: req.body.fatherPrimaryContact ?? null,
      fatherEmailId: req.body.fatherEmailId ?? req.body.fatherEmail ?? null,
      rfidNo: payload.tagId,
    };

    const errors = validateAllStudentsForm(ui);
    if (errors.length) return res.status(400).json({ ok: false, errors });

    if (ui.fatherPrimaryContact && !isValidPhone(ui.fatherPrimaryContact)) {
      return res.status(400).json({ ok: false, errors: ["Father phone must be 10 digits"] });
    }

    // ADDED: Uniqueness checks 

    if (payload.tagId) {
      const existingByTag = await findByTagId(String(payload.tagId).trim());
      if (existingByTag && Number(existingByTag.studentSeqNbr) !== id) {
        return res.status(400).json({
          ok: false,
          errors: ["RFID / Tag ID is already in use by another student"],
        });
      }
    }

    if (payload.studentRegistrationNbr) {
      const existingByAdm = await findByAdmissionNo(
        String(payload.studentRegistrationNbr).trim()
      );
      if (existingByAdm && Number(existingByAdm.studentSeqNbr) !== id) {
        return res.status(400).json({
          ok: false,
          errors: ["Admission number is already in use by another student"],
        });
      }
    }


    console.log("updateStudentController payload for id", id, payload);

    const updated = await updateStudent(id, payload);
    if (!updated) return res.status(404).json({ ok: false, message: "Student not found" });

    return res.json({ ok: true, student: mapRow(updated) });
  } catch (err: any) {
    console.error("updateStudentController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to update student" });
  }
};


export const importStudentsController = async (req: Request, res: Response) => {
  try {
    const rowsAny: unknown[] = Array.isArray(req.body) ? req.body : req.body?.rows;

    if (!rowsAny || !Array.isArray(rowsAny)) {
      return res.status(400).json({ ok: false, message: "No rows provided" });
    }

    const normalized = rowsAny.map((r: any) => ({
      schoolCode: r.schoolCode ?? null,
      zid: r.zid ?? null,
      className: r.className ?? null,
      csaction: r.csaction ?? r.sectionName ?? null,
      tagId: r.tagId ?? r.rfidNo ?? null,
      fullName: (r.fullName ?? r.studentName ?? "").trim(),
      studentRegistrationNbr: r.studentRegistrationNbr ?? r.admissionNo ?? null,
      noOfCommunication: r.noOfCommunication ?? r.fatherPrimaryContact ?? null,
      status: r.status !== undefined ? Number(r.status) : 1,
      createdBy: r.createdBy ?? "import",
      fatherName: typeof r.fatherName !== "undefined" ? r.fatherName : (r.FatherName ?? r["Father Name"] ?? null),
      fatherEmail: typeof r.fatherEmail !== "undefined" ? r.fatherEmail : (r.fatherEmailId ?? r.FATHER_EMAIL ?? null),
      address: typeof r.address !== "undefined" ? r.address : (r.ADDRESS ?? r["Address"] ?? null),
    }));

    console.log("importStudentsController - normalized sample:", normalized.slice(0, 5));

    const result = await importStudents(normalized);
    return res.json({ ok: true, inserted: result.inserted, errors: result.errors });
  } catch (err: any) {
    console.error("importStudentsController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to import students" });
  }
};


export const exportStudentsController = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10000;
    const rows = await fetchStudentsForExport(limit);
    return res.json({ ok: true, students: rows.map(mapRow) });
  } catch (err: any) {
    console.error("exportStudentsController error:", err);
    return res.status(500).json({ ok: false, message: err?.message ?? "Failed to export students" });
  }
  
};

export default {
  listAllStudents,
  getStudent,
  updateStudentController,
  importStudentsController,
  exportStudentsController,
  deleteStudentController
};
