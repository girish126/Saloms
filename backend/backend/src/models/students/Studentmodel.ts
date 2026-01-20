import sql from "mssql";
import { getPool } from "../../config/db";

export type StudentRow = {
  studentSeqNbr: number;
  schoolCode?: string | null;
  zid?: string | null;
  className?: string | null;
  csaction?: string | null;
  tagId?: string | null;
  fullName?: string | null;
  studentRegistrationNbr?: string | null;
  noOfCommunication?: string | null;
  status?: number | null;
  createdBy?: string | null;
  fatherName?: string | null;
  fatherEmailId?: string | null;
  address?: string | null;
  createDate?: string | null;
};

export type CreateStudentPayload = {
  schoolCode?: string | null;
  zid?: string | null;
  className?: string | null;
  csaction?: string | null;
  tagId?: string | null;
  fullName: string;
  studentRegistrationNbr?: string | null;
  noOfCommunication?: string | null;
  status?: number | null;
  createdBy?: string | null;
  fatherName?: string | null;
  fatherEmailId?: string | null;
  address?: string | null;
};

export type CreateResult = {
  student: StudentRow | null;
  parentInserted?: any | null;
};

const isNonEmpty = (v: any) =>
  v !== undefined && v !== null && String(v).trim() !== "";

/**
 * Map DB row
 */
export const mapRow = (r: any): StudentRow => {
  if (!r) return null as any;
  return {
    studentSeqNbr: Number(r.STUDENT_SEQ_NBR ?? r.studentSeqNbr ?? r.id ?? 0),
    schoolCode: r.SCHOOL_CODE ?? r.schoolCode ?? null,
    zid: r.ZID ?? r.zid ?? null,
    className: r.CLASS_NAME ?? r.className ?? null,
    csaction: r.CSACTION ?? r.csaction ?? null,
    tagId: r.TAGID ?? r.tagId ?? null,
    fullName: r.FULL_NAME ?? r.fullName ?? null,
    studentRegistrationNbr:
      r.STUDENT_REGISTRATION_NBR ?? r.studentRegistrationNbr ?? null,
    noOfCommunication: r.NO_OF_COMMUNICATION ?? r.noOfCommunication ?? null,
    status:
      (typeof r.STATUS === "number"
        ? r.STATUS
        : (r.status ?? null)) as number | null,
    createdBy: r.CREATED_BY ?? r.createdBy ?? null,
    fatherName:
      r.fatherName ??
      r.FATHER_NAME ??
      r.father_name ??
      r.parent_name ??
      r.parentName ??
      null,
    fatherEmailId:
      r.fatherEmail ??
      r.FATHER_EMAIL ??
      r.FATHER_EMAIL_ID ??
      r.father_email ??
      r.fatherEmailId ??
      null,
    address: r.address ?? r.ADDRESS ?? null,
    createDate: r.CREATE_DATE ?? r.createDate ?? null,
  };
};

/**
 * Get all
 */
export const getAllStudents = async (
  limit = 1000
): Promise<StudentRow[]> => {
  const pool = (await getPool()) as sql.ConnectionPool;
  const q = `
    SELECT TOP (@limit)
      sm.STUDENT_SEQ_NBR,
      sm.SCHOOL_CODE,
      sm.ZID,
      sm.CLASS_NAME,
      sm.CSACTION,
      sm.TAGID,
      sm.FULL_NAME,
      sm.STUDENT_REGISTRATION_NBR,
      sm.NO_OF_COMMUNICATION,
      sm.STATUS,
      sm.CREATED_BY,
      CONVERT(varchar(30), sm.CREATE_DATE, 120) AS CREATE_DATE,
      sp.fatherName      AS fatherName,
      sp.fatherEmail     AS fatherEmail,
      sp.address         AS address
    FROM dbo.student_master sm
    LEFT JOIN dbo.student_parent_details sp
      ON sp.studentSeqNbr = sm.STUDENT_SEQ_NBR
    ORDER BY sm.STUDENT_SEQ_NBR DESC;
  `;
  const req = pool.request();
  req.input("limit", sql.Int, limit);
  const result = await req.query(q);
  return (result.recordset || []).map(mapRow);
};

/**
 * Get by id
 */
export const getStudentById = async (
  id: number
): Promise<StudentRow | null> => {
  if (!id) return null;
  const pool = (await getPool()) as sql.ConnectionPool;
  const q = `
    SELECT
      sm.STUDENT_SEQ_NBR,
      sm.SCHOOL_CODE,
      sm.ZID,
      sm.CLASS_NAME,
      sm.CSACTION,
      sm.TAGID,
      sm.FULL_NAME,
      sm.STUDENT_REGISTRATION_NBR,
      sm.NO_OF_COMMUNICATION,
      sm.STATUS,
      sm.CREATED_BY,
      CONVERT(varchar(30), sm.CREATE_DATE, 120) AS CREATE_DATE,
      sp.fatherName      AS fatherName,
      sp.fatherEmail     AS fatherEmail,
      sp.address         AS address
    FROM dbo.student_master sm
    LEFT JOIN dbo.student_parent_details sp
      ON sp.studentSeqNbr = sm.STUDENT_SEQ_NBR
    WHERE sm.STUDENT_SEQ_NBR = @id;
  `;
  const req = pool.request();
  req.input("id", sql.Int, id);
  const r = await req.query(q);
  const row = r.recordset?.[0] ?? null;
  return row ? mapRow(row) : null;
};

/**
 * Find by tag
 */
export const findByTagId = async (
  tagId: string
): Promise<StudentRow | null> => {
  if (!tagId) return null;
  const pool = (await getPool()) as sql.ConnectionPool;
  const q = `
    SELECT TOP (1) *
    FROM dbo.student_master
    WHERE TAGID = @tagId;
  `;
  const req = pool.request();
  req.input("tagId", sql.VarChar(120), String(tagId).trim());
  const r = await req.query(q);
  const row = r.recordset?.[0] ?? null;
  return row ? mapRow(row) : null;
};

/**
 * Find by admission no
 */
export const findByAdmissionNo = async (
  admissionNo: string
): Promise<StudentRow | null> => {
  if (!admissionNo) return null;
  const pool = (await getPool()) as sql.ConnectionPool;
  const q = `
    SELECT TOP (1) *
    FROM dbo.student_master
    WHERE STUDENT_REGISTRATION_NBR = @admissionNo;
  `;
  const req = pool.request();
  req.input("admissionNo", sql.VarChar(220), String(admissionNo).trim());
  const r = await req.query(q);
  const row = r.recordset?.[0] ?? null;
  return row ? mapRow(row) : null;
};

/**
 *UPDATE student
 */
export const updateStudent = async (
  id: number,
  payload: any
): Promise<StudentRow | null> => {
  if (!id) throw new Error("id required for updateStudent");

  const pool = (await getPool()) as sql.ConnectionPool;
  const transaction = pool.transaction();

  try {
    await transaction.begin();
    const tr = transaction.request();

    tr.input("id", sql.Int, id);
    tr.input("className", sql.VarChar(80), payload.className ?? null);
    tr.input("csaction", sql.VarChar(60), payload.csaction ?? null);
    tr.input("tagId", sql.VarChar(120), payload.tagId ?? null);
    tr.input("fullName", sql.VarChar(220), payload.fullName ?? null);
    tr.input(
      "studentRegistrationNbr",
      sql.VarChar(220),
      payload.studentRegistrationNbr ?? null
    );
    tr.input(
      "noOfCommunication",
      sql.VarChar(50),
      payload.noOfCommunication ?? null
    );
    tr.input(
      "status",
      sql.Int,
      payload.status !== undefined ? payload.status : null
    );

    const setClauses: string[] = [];
    const has = (k: string) =>
      Object.prototype.hasOwnProperty.call(payload, k);

    if (has("className")) setClauses.push("CLASS_NAME = @className");
    if (has("csaction")) setClauses.push("CSACTION = @csaction");
    if (has("tagId")) setClauses.push("TAGID = @tagId");
    if (has("fullName")) setClauses.push("FULL_NAME = @fullName");
    if (has("studentRegistrationNbr"))
      setClauses.push("STUDENT_REGISTRATION_NBR = @studentRegistrationNbr");
    if (has("noOfCommunication"))
      setClauses.push("NO_OF_COMMUNICATION = @noOfCommunication");
    if (has("status"))
      setClauses.push("STATUS = COALESCE(@status, STATUS)");

    if (setClauses.length > 0) {
      const updateSql = `
        UPDATE dbo.student_master
        SET ${setClauses.join(", ")}
        WHERE STUDENT_SEQ_NBR = @id;
      `;
      await tr.query(updateSql);
    }

    if (
      has("fatherName") ||
      has("fatherEmail") ||
      has("address")
    ) {
      tr.input("fatherName", sql.VarChar(250), payload.fatherName ?? null);
      tr.input("fatherEmail", sql.VarChar(250), payload.fatherEmail ?? null);
      tr.input("address", sql.VarChar(1000), payload.address ?? null);

      const parentSql = `
        IF EXISTS (SELECT 1 FROM dbo.student_parent_details WHERE studentSeqNbr = @id)
        BEGIN
          UPDATE dbo.student_parent_details
          SET
            fatherName = COALESCE(@fatherName, fatherName),
            fatherEmail = COALESCE(@fatherEmail, fatherEmail),
            address = COALESCE(@address, address),
            updatedAt = GETDATE()
          WHERE studentSeqNbr = @id;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.student_parent_details
            (studentSeqNbr, fatherName, fatherEmail, address, createdAt, updatedAt)
          VALUES
            (@id, @fatherName, @fatherEmail, @address, GETDATE(), GETDATE());
        END
      `;
      await tr.query(parentSql);
    }
    // END ADDITION

    await transaction.commit();
    return await getStudentById(id);
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}
    console.error("updateStudent error:", err);
    throw err;
  }
};

/**
 * Create student + parent (your existing code)
 */
export const createStudentWithParent = async (
  payload: CreateStudentPayload,
  parentPayload?: {
    fatherName?: string | null;
    fatherEmailId?: string | null;
    address?: string | null;
  }
): Promise<CreateResult> => {
  const pool = (await getPool()) as sql.ConnectionPool;
  const transaction = pool.transaction();

  try {
    await transaction.begin();
    const tr = transaction.request();

    const tagIdValue = (payload.tagId ?? "").toString().trim();
    tr.input("tagId", sql.VarChar(120), tagIdValue || null);

    if (tagIdValue) {
      const checkSql = `
        SELECT TOP (1) STUDENT_SEQ_NBR 
        FROM dbo.student_master WITH (UPDLOCK, HOLDLOCK)
        WHERE TAGID = @tagId;
      `;
      const checkRes = await tr.query(checkSql);
      if ((checkRes.recordset?.length ?? 0) > 0) {
        throw new Error("RFID_DUPLICATE: Tag ID already exists");
      }
    }

    const admissionValue = (payload.studentRegistrationNbr ?? "")
      .toString()
      .trim();
    tr.input(
      "studentRegistrationNbr",
      sql.VarChar(220),
      admissionValue || null
    );

    if (admissionValue) {
      const checkAdmSql = `
        SELECT TOP (1) STUDENT_SEQ_NBR 
        FROM dbo.student_master WITH (UPDLOCK, HOLDLOCK)
        WHERE STUDENT_REGISTRATION_NBR = @studentRegistrationNbr;
      `;
      const checkAdmRes = await tr.query(checkAdmSql);
      if ((checkAdmRes.recordset?.length ?? 0) > 0) {
        throw new Error("ADMISSION_DUPLICATE: Admission No already exists");
      }
    }

    tr.input("schoolCode", sql.VarChar(80), payload.schoolCode ?? "shalom");
    tr.input("zid", sql.VarChar(80), payload.zid ?? "1");
    tr.input("className", sql.VarChar(80), payload.className ?? null);
    tr.input("csaction", sql.VarChar(60), payload.csaction ?? null);
    tr.input("fullName", sql.VarChar(220), payload.fullName ?? "");
    tr.input(
      "noOfCommunication",
      sql.VarChar(50),
      payload.noOfCommunication ?? null
    );
    tr.input("status", sql.Int, payload.status ?? 1);
    tr.input("createdBy", sql.VarChar(120), payload.createdBy ?? "web");

    const insertStudentSql = `
      INSERT INTO dbo.student_master
        (SCHOOL_CODE, ZID, CLASS_NAME, CSACTION, TAGID, FULL_NAME, STUDENT_REGISTRATION_NBR, NO_OF_COMMUNICATION, STATUS, CREATED_BY, CREATE_DATE)
      OUTPUT inserted.*
      VALUES
        (@schoolCode, @zid, @className, @csaction, @tagId, @fullName, @studentRegistrationNbr, @noOfCommunication, @status, @createdBy, GETDATE());
    `;

    const studentResult = await tr.query(insertStudentSql);
    const insertedStudentRaw = studentResult.recordset?.[0] ?? null;
    if (!insertedStudentRaw) throw new Error("Failed to insert student");

    const p =
      parentPayload ?? {
        fatherName: payload.fatherName ?? null,
        fatherEmailId: payload.fatherEmailId ?? null,
        address: payload.address ?? null,
      };

    const shouldInsertParent =
      isNonEmpty(p.fatherName) ||
      isNonEmpty(p.fatherEmailId) ||
      isNonEmpty(p.address);

    let insertedParent: any = null;
    if (shouldInsertParent) {
      const studentSeqNbr = Number(
        insertedStudentRaw.STUDENT_SEQ_NBR ??
          insertedStudentRaw.studentSeqNbr ??
          0
      );
      tr.input("studentSeqNbr", sql.Int, studentSeqNbr);
      tr.input("fatherName", sql.VarChar(250), p.fatherName ?? null);
      tr.input(
        "fatherEmail",
        sql.VarChar(250),
        p.fatherEmailId ?? null
      );
      tr.input("address", sql.VarChar(1000), p.address ?? null);

      const insertParentSql = `
        INSERT INTO dbo.student_parent_details
          (studentSeqNbr, fatherName, fatherEmail, address, createdAt, updatedAt)
        OUTPUT inserted.*
        VALUES (@studentSeqNbr, @fatherName, @fatherEmail, @address, GETDATE(), GETDATE());
      `;
      const parentRes = await tr.query(insertParentSql);
      insertedParent = parentRes.recordset?.[0] ?? null;
    }

    await transaction.commit();

    return {
      student: insertedStudentRaw ? mapRow(insertedStudentRaw) : null,
      parentInserted: insertedParent ?? null,
    };
  } catch (err: any) {
    try {
      await transaction.rollback();
    } catch {}

    if (String(err?.message).includes("RFID_DUPLICATE")) {
      const e = new Error("RFID_DUPLICATE: Tag ID already exists");
      (e as any).code = "RFID_DUPLICATE";
      throw e;
    }

    if (String(err?.message).includes("ADMISSION_DUPLICATE")) {
      const e = new Error("ADMISSION_DUPLICATE: Admission No already exists");
      (e as any).code = "ADMISSION_DUPLICATE";
      throw e;
    }

    throw err;
  }
};

/**
 * Bulk import
 */
export const importStudents = async (rows: any[]) => {
  const inserted: number[] = [];
  const errors: any[] = [];

  for (const r of rows) {
    try {
      const res = await createStudentWithParent(
        {
          schoolCode: r.schoolCode ?? "shalom",
          zid: r.zid ?? "1",
          className: r.className ?? null,
          csaction: r.csaction ?? null,
          tagId: r.tagId ?? null,
          fullName: r.fullName ?? "",
          studentRegistrationNbr: r.studentRegistrationNbr ?? null,
          noOfCommunication: r.noOfCommunication ?? null,
          status: r.status ?? 1,
          createdBy: r.createdBy ?? "import",
        },
        {
          fatherName: r.fatherName ?? null,
          fatherEmailId: r.fatherEmail ?? r.fatherEmailId ?? null,
          address: r.address ?? null,
        }
      );
      inserted.push(Number(res.student?.studentSeqNbr ?? 0));
    } catch (err: any) {
      errors.push({ row: r, error: err?.message ?? String(err) });
    }
  }

  return { inserted, errors };
};

export const fetchStudentsForExport = async (limit = 10000) => {
  return getAllStudents(limit);
};

export const deleteStudent = async (id: number): Promise<boolean> => {
  if (!id) throw new Error("id required for deleteStudent");

  const pool = (await getPool()) as sql.ConnectionPool;
  const transaction = pool.transaction();

  try {
    await transaction.begin();
    const tr = transaction.request();
    tr.input("id", sql.Int, id);

    // delete from parent table first (safe if FK exists)
    await tr.query(`
      DELETE FROM dbo.student_parent_details
      WHERE studentSeqNbr = @id;
    `);

    // delete main student record
    const res = await tr.query(`
      DELETE FROM dbo.student_master
      WHERE STUDENT_SEQ_NBR = @id;
    `);

    await transaction.commit();

    return (res.rowsAffected?.[0] ?? 0) > 0;
  } catch (err) {
    try {
      await transaction.rollback();
    } catch {}
    console.error("deleteStudent error:", err);
    throw err;
  }
};

export default {
  mapRow,
  getAllStudents,
  getStudentById,
  findByTagId,
  findByAdmissionNo,
  updateStudent,
  createStudentWithParent,
  importStudents,
  deleteStudent,
  fetchStudentsForExport,
};
