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
  fatherName?: string | null;
  fatherEmailId?: string | null;
  address?: string | null;
  createDate?: string | null;
};

const isNonEmpty = (v: any) => v !== undefined && v !== null && String(v).trim() !== "";

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
    studentRegistrationNbr: r.STUDENT_REGISTRATION_NBR ?? r.studentRegistrationNbr ?? null,
    noOfCommunication: r.NO_OF_COMMUNICATION ?? r.noOfCommunication ?? null,
    status: (typeof r.STATUS === "number" ? r.STATUS : (r.status ?? null)) as number | null,
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

export const getAllStudents = async (limit = 1000): Promise<StudentRow[]> => {
  const pool = await getPool();
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
  const rows = result.recordset || [];
  return rows.map(mapRow);
};

export const getStudentById = async (id: number): Promise<StudentRow | null> => {
  if (!id) return null;
  const pool = await getPool();
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

export default {
  mapRow,
  getAllStudents,
  getStudentById,
};
